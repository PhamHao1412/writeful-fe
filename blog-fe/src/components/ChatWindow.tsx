import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import type { Conversation, Message } from '../api/chat.api';
import { getMessages, sendMessage, markConversationAsRead } from '../api/chat.api';
import { uploadImages } from '../api/media.api';
import { chatWebSocket } from '../services/chatWebSocket';
import MessageBubble from './MessageBubble';
import { useCall } from '../contexts/CallContext';
import { showToast } from './Toast';
import type { ActiveStatus } from '../pages/Chat';
import '../styles/ChatWindow.css';

interface ChatWindowProps {
    conversation: Conversation;
    currentUserId: string;
    onDeleteConversation?: () => void;
    onBack?: () => void; // For mobile: go back to conversation list
    activeStatuses?: Record<string, ActiveStatus>;
}

export default function ChatWindow({ conversation, currentUserId, onDeleteConversation, onBack, activeStatuses = {} }: ChatWindowProps) {
    const navigate = useNavigate();
    const { startCall } = useCall();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set<string>());
    const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isInitialLoadRef = useRef(true);
    const typingTimeoutRef = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);



    // Periodic tick to update "last active X minutes ago" text in real-time
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 30000); // Rerender every 30 seconds for extra freshness!
        return () => clearInterval(interval);
    }, []);

    // Format online status or last active time
    const getActiveStatusText = () => {
        if (conversation.type === 'group') {
            return `${conversation.participants.length} members`;
        }

        const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
        if (!otherParticipant) return 'Direct message';

        const status = activeStatuses[otherParticipant.user_id];
        if (!status) return 'Offline';

        if (status.isOnline) {
            return 'Active now';
        }

        if (!status.lastActiveAt) {
            return 'Offline';
        }

        const date = new Date(status.lastActiveAt);
        const now = new Date();
        const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

        if (diffInSeconds < 60) {
            return 'Active just now';
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `Active ${diffInMinutes}m ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `Active ${diffInHours}h ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        return `Active ${diffInDays}d ago`;
    };

    const getOtherParticipantAvatar = () => {
        if (conversation.type === 'group') {
            return '';
        }
        const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
        const name = otherParticipant?.user?.display_name || otherParticipant?.user?.username || 'Unknown User';
        return otherParticipant?.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    };

    const isLastMessageSeen = () => {
        if (messages.length === 0) return false;
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.sender_id !== currentUserId) return false;

        if (conversation.type === 'group') return false;
        const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
        if (!otherParticipant || !otherParticipant.last_read_at) return false;

        const lastReadTime = new Date(otherParticipant.last_read_at).getTime();
        const lastMsgTime = new Date(lastMsg.created_at).getTime();

        return lastReadTime >= lastMsgTime - 1000;
    };

    // Image upload states & reference
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showToast('Please select an image file', 'warning');
                return;
            }
            setSelectedImage(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Helper function to sort messages by created_at timestamp
    const sortMessagesByTime = (msgs: Message[]) => {
        return [...msgs].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    };

    // Get conversation name
    const getConversationName = () => {
        if (conversation.type === 'group' && conversation.name) {
            return conversation.name;
        }

        // For direct messages, show the other participant's name
        const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
        return otherParticipant?.user?.display_name || 'Unknown User';
    };

    // Get conversation avatar
    const getConversationAvatar = () => {
        if (conversation.type === 'group') {
            return '👥'; // Group icon
        }

        const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
        const name = otherParticipant?.user?.display_name || otherParticipant?.user?.username || 'Unknown User';
        return otherParticipant?.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    };

    // Get other participant's username for navigation
    const getOtherParticipantUsername = () => {
        if (conversation.type === 'group') {
            return null; // Don't navigate for group chats
        }

        const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
        return otherParticipant?.user?.username;
    };

    // Handle avatar click to navigate to user profile
    const handleAvatarClick = () => {
        const username = getOtherParticipantUsername();
        if (username) {
            navigate(`/users/${username}`);
        }
    };

    const handleStartCall = (type: 'audio' | 'video') => {
        const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
        if (!otherParticipant) return;

        const displayName = otherParticipant.user?.display_name || otherParticipant.user?.username || 'Unknown User';
        const avatarUrl = otherParticipant.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

        startCall(
            otherParticipant.user_id,
            type,
            {
                id: otherParticipant.user_id,
                displayName: displayName,
                avatarUrl: avatarUrl,
                username: otherParticipant.user?.username,
            },
            conversation.id
        );
    };

    // Load messages when conversation changes
    useEffect(() => {
        isInitialLoadRef.current = true; // Mark as initial load for this conversation
        loadMessages();
        setHasMarkedAsRead(false); // Reset when conversation changes
        setReplyingToMessage(null); // Reset replying message state

        // Auto-focus the input field when switching conversations for premium UX
        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    }, [conversation.id]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > 0) {
            if (isInitialLoadRef.current) {
                // Initial load: scroll instantly to avoid smooth scroll lag/lapse
                scrollToBottom('auto');
                // Use a short timeout to handle React DOM updates completely
                const timer = setTimeout(() => {
                    scrollToBottom('auto');
                    isInitialLoadRef.current = false;
                }, 50);
                return () => clearTimeout(timer);
            } else {
                // New message received/sent: scroll smoothly for premium Messenger feel!
                scrollToBottom('smooth');
            }
        }
    }, [messages]);

    // Handle late image rendering scrolling adjustments
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleImageLoad = (event: Event) => {
            if ((event.target as HTMLElement).tagName === 'IMG') {
                // When any image finishes loading, scroll to bottom to adjust for dynamic heights
                scrollToBottom(isInitialLoadRef.current ? 'auto' : 'smooth');
            }
        };

        // Capture phase to catch 'load' event of child elements
        container.addEventListener('load', handleImageLoad, true);
        return () => {
            container.removeEventListener('load', handleImageLoad, true);
        };
    }, []);

    // WebSocket message handler
    useEffect(() => {
        const unsubscribe = chatWebSocket.onMessage((data) => {
            if (data.type === 'new_message') {
                const newMessage: Message = data.payload;

                if (newMessage.conversation_id === conversation.id) {
                    // Check if message already exists to avoid duplicates
                    setMessages(prev => {
                        const exists = prev.some(msg => msg.id === newMessage.id);
                        if (exists) {
                            return prev; // Message already in list, don't add again
                        }
                        return sortMessagesByTime([...prev, newMessage]);
                    });

                    // Reset hasMarkedAsRead if message is from another user
                    // This allows user to click input again to mark new messages as read
                    if (newMessage.sender_id !== currentUserId) {
                        setHasMarkedAsRead(false);

                    }
                }
            } else if (data.type === 'typing') {
                const { conversation_id, user_id, is_typing } = data.payload;
                if (conversation_id === conversation.id && user_id !== currentUserId) {
                    setTypingUsers(prev => {
                        const next = new Set(prev);
                        if (is_typing) {
                            next.add(user_id);
                        } else {
                            next.delete(user_id);
                        }
                        return next;
                    });
                }
            } else if (data.type === 'message_reaction') {
                const { message_id, user_id, emoji, action } = data.payload;
                setMessages(prev => prev.map(msg => {
                    if (msg.id !== message_id) return msg;

                    const currentReactions = msg.reactions || [];
                    let updatedReactions = [...currentReactions];

                    if (action === 'remove') {
                        updatedReactions = updatedReactions.filter(r => r.user_id !== user_id);
                    } else if (action === 'add') {
                        if (!updatedReactions.some(r => r.user_id === user_id)) {
                            updatedReactions.push({
                                id: Math.random().toString(),
                                message_id,
                                user_id,
                                emoji,
                                created_at: new Date().toISOString()
                            });
                        }
                    } else if (action === 'update') {
                        updatedReactions = updatedReactions.map(r =>
                            r.user_id === user_id ? { ...r, emoji } : r
                        );
                    }

                    return { ...msg, reactions: updatedReactions };
                }));
            }
        });

        return unsubscribe;
    }, [conversation.id, currentUserId]);

    const loadMessages = async () => {
        setIsLoading(true);
        try {
            const { data } = await getMessages({
                conversation_id: conversation.id,
                page: 1,
                page_size: 50
            });
            setMessages(sortMessagesByTime(data));
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const handleReply = (message: Message) => {
        setReplyingToMessage(message);
        // Focus the input field immediately so the user can start typing
        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    };

    const getReplyingToDisplayName = () => {
        if (!replyingToMessage) return '';
        const senderId = replyingToMessage.sender_id;
        if (senderId === currentUserId) {
            return 'yourself';
        }
        const p = conversation.participants.find(part => part.user_id === senderId);
        return p?.user?.display_name || p?.user?.username || 'User';
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if ((!inputValue.trim() && !selectedImage) || isSending) return;

        setIsSending(true);
        const messageContent = inputValue.trim();
        setInputValue(''); // Clear input immediately for better UX

        let imageUrl = '';
        const currentSelectedImage = selectedImage;
        if (currentSelectedImage) {
            setIsUploading(true);
        }

        try {
            if (currentSelectedImage) {
                const uploadedImages = await uploadImages([currentSelectedImage]);
                if (uploadedImages && uploadedImages.length > 0) {
                    imageUrl = uploadedImages[0].url;
                }
            }

            await sendMessage({
                conversation_id: conversation.id,
                type: imageUrl ? 'image' : 'text',
                content: messageContent,
                media_url: imageUrl || undefined,
                reply_to_message_id: replyingToMessage?.id || undefined
            });

            // Clear selected image state only on success
            setSelectedImage(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Clear replying message state on success
            setReplyingToMessage(null);

            // Stop typing indicator
            chatWebSocket.sendTypingIndicator(conversation.id, currentUserId, false);
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
            // Restore state on error
            if (messageContent) setInputValue(messageContent);
        } finally {
            setIsSending(false);
            setIsUploading(false);
            // Auto-focus input after sending - use requestAnimationFrame for better reliability
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    };

    const handleInputClick = () => {
        // Mark as read when user clicks on input (shows intent to read and reply)
        // hasMarkedAsRead is reset to false when new messages arrive from others
        if (!hasMarkedAsRead) {
            setHasMarkedAsRead(true);

            // Immediately dispatch event for optimistic UI update FIRST
            window.dispatchEvent(new CustomEvent('conversation-read', {
                detail: { conversationId: conversation.id }
            }));

            // Then call API in background
            markConversationAsRead(conversation.id)
                .then(() => {
                })
                .catch((error) => {
                    console.error('Error marking conversation as read:', error);
                    // Revert flag on error
                    setHasMarkedAsRead(false);
                });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);

        // Mark as read immediately when user starts typing a reply
        handleInputClick();

        // Send typing indicator
        chatWebSocket.sendTypingIndicator(conversation.id, currentUserId, true);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing indicator after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            chatWebSocket.sendTypingIndicator(conversation.id, currentUserId, false);
        }, 2000);
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setInputValue(prev => prev + emojiData.emoji);
        setShowEmojiPicker(false);
        // Focus back on input after selecting emoji
        inputRef.current?.focus();
    };

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    return (
        <div className="chat-window">
            {/* Header */}
            <div className="chat-window__header">
                {/* Back button for mobile */}
                {onBack && (
                    <button
                        className="chat-window__back-btn"
                        onClick={onBack}
                        title="Back to conversations"
                    >
                        ←
                    </button>
                )}
                <div className="chat-window__header-info">
                    <div className="chat-window__avatar-wrapper">
                        {typeof getConversationAvatar() === 'string' && getConversationAvatar().startsWith('http') ? (
                            <img
                                src={getConversationAvatar()}
                                alt={getConversationName()}
                                className="chat-window__avatar"
                                onClick={handleAvatarClick}
                                style={{ cursor: conversation.type === 'direct' ? 'pointer' : 'default' }}
                                title={conversation.type === 'direct' ? 'View profile' : ''}
                                onError={(e) => {
                                    const name = getConversationName();
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
                                }}
                            />
                        ) : (
                            <div
                                className="chat-window__avatar-emoji"
                                onClick={handleAvatarClick}
                                style={{ cursor: conversation.type === 'direct' ? 'pointer' : 'default' }}
                                title={conversation.type === 'direct' ? 'View profile' : ''}
                            >
                                {getConversationAvatar()}
                            </div>
                        )}
                        {conversation.type === 'direct' && (() => {
                            const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
                            const isOnline = otherParticipant ? (activeStatuses[otherParticipant.user_id]?.isOnline || false) : false;
                            return isOnline ? <span className="chat-window__online-badge"></span> : null;
                        })()}
                    </div>
                    <div>
                        <h2 className="chat-window__title">{getConversationName()}</h2>
                        <p className="chat-window__subtitle">
                            {getActiveStatusText()}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {conversation.type === 'direct' && (
                        <>
                            <button
                                type="button"
                                className="chat-window__call-btn"
                                onClick={() => handleStartCall('audio')}
                                title="Voice Call"
                            >
                                📞
                            </button>
                            <button
                                type="button"
                                className="chat-window__call-btn"
                                onClick={() => handleStartCall('video')}
                                title="Video Call"
                            >
                                📹
                            </button>
                        </>
                    )}
                    {onDeleteConversation && (
                        <button
                            type="button"
                            className="chat-window__delete-btn"
                            onClick={onDeleteConversation}
                            title="Delete conversation"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div 
                ref={messagesContainerRef} 
                className="chat-window__messages"
                onClick={handleInputClick} // Clicking anywhere in the message history container also marks as read
            >
                {isLoading ? (
                    <div className="chat-window__loading">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="chat-window__empty">
                        <p>No messages yet. Start the conversation! 👋</p>
                    </div>
                ) : (
                    messages.map((message, index) => {
                        const isLast = index === messages.length - 1;
                        const isOwn = message.sender_id === currentUserId;
                        return (
                            <div key={message.id} id={`msg-${message.id}`} className="chat-window__message-row">
                                <MessageBubble
                                    message={message}
                                    isOwnMessage={isOwn}
                                    onReply={handleReply}
                                    participants={conversation.participants}
                                    currentUserId={currentUserId}
                                />
                                {isLast && isOwn && isLastMessageSeen() && (
                                    <div className="chat-window__seen-row">
                                        <img
                                            src={getOtherParticipantAvatar()}
                                            alt="Seen"
                                            className="chat-window__seen-avatar"
                                            title={`Seen by ${getConversationName()}`}
                                            onError={(e) => {
                                                const name = getConversationName();
                                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                    <div className="chat-window__typing">
                        <span className="chat-window__typing-dots">
                            <span></span><span></span><span></span>
                        </span>
                        <span className="chat-window__typing-text">typing...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Bar */}
            {selectedImage && (
                <div className="chat-window__preview-bar">
                    <div className="chat-window__preview-container">
                        <img
                            src={URL.createObjectURL(selectedImage)}
                            alt="Selected upload preview"
                            className="chat-window__preview-img"
                        />
                        <button
                            type="button"
                            className="chat-window__preview-remove"
                            onClick={handleRemoveImage}
                            disabled={isSending || isUploading}
                            title="Remove image"
                            id="btn-remove-preview"
                        >
                            ✕
                        </button>
                    </div>
                    {isUploading && (
                        <div className="chat-window__preview-loader">
                            <span className="chat-window__preview-spinner"></span>
                            Uploading...
                        </div>
                    )}
                </div>
            )}

            {/* Input */}
            <form className="chat-window__input-form" onSubmit={handleSendMessage}>
                {replyingToMessage && (
                    <div className="chat-window__reply-preview-bar">
                        <div className="chat-window__reply-preview-info">
                            <span className="chat-window__reply-preview-title">
                                Replying to {getReplyingToDisplayName()}
                            </span>
                            <span className="chat-window__reply-preview-content">
                                {replyingToMessage.type === 'text'
                                    ? replyingToMessage.content
                                    : replyingToMessage.type === 'image'
                                        ? '📷 Photo'
                                        : replyingToMessage.type === 'file'
                                            ? '📎 File'
                                            : '📞 Call'}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="chat-window__reply-preview-close"
                            onClick={() => setReplyingToMessage(null)}
                            title="Cancel reply"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="chat-image-input"
                />

                <div className="chat-window__input-capsule">
                    {/* Left: Emoji Button */}
                    <button
                        type="button"
                        className="chat-window__emoji-btn-left"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Add emoji"
                        disabled={isSending || isUploading}
                    >
                        😊
                    </button>

                    {/* Emoji Picker container */}
                    {showEmojiPicker && (
                        <div className="chat-window__emoji-picker" ref={emojiPickerRef}>
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                width={320}
                                height={400}
                                searchPlaceHolder="Search emoji..."
                                previewConfig={{ showPreview: false }}
                            />
                        </div>
                    )}

                    {/* Middle: Text Input */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onClick={handleInputClick}
                        placeholder="Message..."
                        className="chat-window__text-input"
                        disabled={isSending || isUploading}
                    />

                    {/* Right: Actions or Send button */}
                    <div className="chat-window__right-actions">
                        {(!inputValue.trim() && !selectedImage) ? (
                            <>
                                {/* Microphone placeholder */}
                                <button
                                    type="button"
                                    className="chat-window__inline-btn"
                                    title="Voice message (Placeholder)"
                                    onClick={() => showToast("Voice message feature is coming soon!", "info")}
                                >
                                    🎤
                                </button>
                                {/* Image Attachment Button */}
                                <button
                                    type="button"
                                    className="chat-window__inline-btn"
                                    onClick={triggerFileInput}
                                    disabled={isSending || isUploading}
                                    title="Attach image"
                                    id="btn-attach-image"
                                >
                                    🖼️
                                </button>
                                {/* Sticker placeholder */}
                                <button
                                    type="button"
                                    className="chat-window__inline-btn"
                                    title="Stickers (Placeholder)"
                                    onClick={() => showToast("Stickers feature is coming soon!", "info")}
                                >
                                    ✨
                                </button>
                            </>
                        ) : (
                            <button
                                type="submit"
                                className="chat-window__inline-send-btn"
                                disabled={isSending || isUploading}
                                title="Send message"
                            >
                                {isSending || isUploading ? (
                                    <span className="chat-window__send-spinner"></span>
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="chat-window__send-svg">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
