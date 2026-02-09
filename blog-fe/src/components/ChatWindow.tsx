import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import type { Conversation, Message } from '../api/chat.api';
import { getMessages, sendMessage, markConversationAsRead } from '../api/chat.api';
import { chatWebSocket } from '../services/chatWebSocket';
import MessageBubble from './MessageBubble';
import '../styles/ChatWindow.css';

interface ChatWindowProps {
    conversation: Conversation;
    currentUserId: string;
    onDeleteConversation?: () => void;
}

export default function ChatWindow({ conversation, currentUserId, onDeleteConversation }: ChatWindowProps) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set<string>());
    const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

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
        return otherParticipant?.user?.avatar_url || 'https://via.placeholder.com/40';
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

    // Load messages when conversation changes
    useEffect(() => {
        loadMessages();
        setHasMarkedAsRead(false); // Reset when conversation changes
    }, [conversation.id]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!inputValue.trim() || isSending) return;

        setIsSending(true);
        const messageContent = inputValue.trim();
        setInputValue(''); // Clear input immediately for better UX

        try {
            await sendMessage({
                conversation_id: conversation.id,
                type: 'text',
                content: messageContent
            });

            // Don't add message to state here - let WebSocket handle it
            // This prevents duplicate messages

            // Stop typing indicator
            chatWebSocket.sendTypingIndicator(conversation.id, currentUserId, false);
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
            // Restore input value on error
            setInputValue(messageContent);
        } finally {
            setIsSending(false);
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
                <div className="chat-window__header-info">
                    {typeof getConversationAvatar() === 'string' && getConversationAvatar().startsWith('http') ? (
                        <img
                            src={getConversationAvatar()}
                            alt={getConversationName()}
                            className="chat-window__avatar"
                            onClick={handleAvatarClick}
                            style={{ cursor: conversation.type === 'direct' ? 'pointer' : 'default' }}
                            title={conversation.type === 'direct' ? 'View profile' : ''}
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
                    <div>
                        <h2 className="chat-window__title">{getConversationName()}</h2>
                        <p className="chat-window__subtitle">
                            {conversation.type === 'group'
                                ? `${conversation.participants.length} members`
                                : 'Direct message'}
                        </p>
                    </div>
                </div>
                {onDeleteConversation && (
                    <button
                        className="chat-window__delete-btn"
                        onClick={onDeleteConversation}
                        title="Delete conversation"
                    >
                        🗑️
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="chat-window__messages">
                {isLoading ? (
                    <div className="chat-window__loading">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="chat-window__empty">
                        <p>No messages yet. Start the conversation! 👋</p>
                    </div>
                ) : (
                    messages.map(message => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwnMessage={message.sender_id === currentUserId}
                        />
                    ))
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

            {/* Input */}
            <form className="chat-window__input-form" onSubmit={handleSendMessage}>
                <div className="chat-window__input-wrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onClick={handleInputClick}
                        placeholder="Type a message..."
                        className="chat-window__input"
                        disabled={isSending}
                    />
                    <button
                        type="button"
                        className="chat-window__emoji-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Add emoji"
                    >
                        😊
                    </button>

                    {/* Emoji Picker */}
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
                </div>
                <button
                    type="submit"
                    className="chat-window__send-btn"
                    disabled={!inputValue.trim() || isSending}
                >
                    {isSending ? '⏳' : '📤'}
                </button>
            </form>
        </div>
    );
}
