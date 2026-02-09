import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Conversation } from '../api/chat.api';
import { getConversations, createConversation, deleteConversation, markConversationAsRead } from '../api/chat.api';
import { chatWebSocket } from '../services/chatWebSocket';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import FollowingList from '../components/FollowingList';
import { getProfile } from '../api/auth.api';
import '../styles/Chat.css';

export default function Chat() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatUserId, setNewChatUserId] = useState('');
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    useEffect(() => {
        initializeChat();

        return () => {
            // Cleanup WebSocket on unmount
            chatWebSocket.disconnect();
        };
    }, []);

    // Listen for new messages to update conversation list
    useEffect(() => {
        const unsubscribe = chatWebSocket.onMessage((data) => {
            if (data.type === 'new_message') {
                // Reload conversations to update last message and unread count
                loadConversations();
            }
        });

        return unsubscribe;
    }, []);

    // Listen for conversation-read events to update unread count
    useEffect(() => {
        const handleConversationRead = (event: Event) => {
            const customEvent = event as CustomEvent<{ conversationId: string }>;
            const { conversationId } = customEvent.detail;

            // Optimistically update the unread count in local state
            setConversations(prev => prev.map(conv =>
                conv.id === conversationId
                    ? { ...conv, unread_count: 0 }
                    : conv
            ));

            // Also update selected conversation if it matches
            if (selectedConversation?.id === conversationId) {
                setSelectedConversation(prev =>
                    prev ? { ...prev, unread_count: 0 } : null
                );
            }
        };

        window.addEventListener('conversation-read', handleConversationRead);

        return () => {
            window.removeEventListener('conversation-read', handleConversationRead);
        };
    }, [selectedConversation]);

    const initializeChat = async () => {
        try {
            // Get current user profile
            const profile = await getProfile();
            setCurrentUserId(profile.id);

            // Connect to WebSocket
            const token = localStorage.getItem('access_token');
            if (token) {
                chatWebSocket.connect(token, profile.id);
            }

            // Load conversations
            await loadConversations();
        } catch (error) {
            console.error('Error initializing chat:', error);
            // If unauthorized, redirect to login
            if ((error as any)?.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadConversations = async () => {
        try {
            const { data } = await getConversations({ page: 1, page_size: 50 });
            setConversations(data);

            // Restore selected conversation from URL if exists
            const conversationIdFromUrl = searchParams.get('conversation');
            if (conversationIdFromUrl && data.length > 0) {
                const conversation = data.find(c => c.id === conversationIdFromUrl);
                if (conversation) {
                    setSelectedConversation(conversation);
                }
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
        // Update URL with conversation ID
        setSearchParams({ conversation: conversation.id });

        // Mark as read when user selects the conversation
        if (conversation.unread_count > 0) {

            // Optimistically update UI immediately
            window.dispatchEvent(new CustomEvent('conversation-read', {
                detail: { conversationId: conversation.id }
            }));

            // Call API in background
            markConversationAsRead(conversation.id).catch((error) => {
                console.error('Error marking conversation as read:', error);
            });
        }
    };

    const handleCreateNewChat = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newChatUserId.trim() || isCreatingChat) return;

        setIsCreatingChat(true);
        try {
            const newConversation = await createConversation({
                type: 'direct',
                participant_ids: [newChatUserId.trim()]
            });

            // Add to conversations list
            setConversations(prev => [newConversation, ...prev]);
            setSelectedConversation(newConversation);
            // Update URL
            setSearchParams({ conversation: newConversation.id });

            // Close modal and reset
            setShowNewChatModal(false);
            setNewChatUserId('');
        } catch (error) {
            console.error('Error creating conversation:', error);
            alert('Failed to create conversation. Please check the user ID and try again.');
        } finally {
            setIsCreatingChat(false);
        }
    };

    const handleSelectFollowingUser = async (userId: string) => {
        try {
            // Check if conversation already exists
            const existingConversation = conversations.find(conv =>
                conv.type === 'direct' &&
                conv.participants.some(p => p.user_id === userId)
            );

            if (existingConversation) {
                setSelectedConversation(existingConversation);
                setSearchParams({ conversation: existingConversation.id });
            } else {
                // Create new conversation
                const newConversation = await createConversation({
                    type: 'direct',
                    participant_ids: [userId]
                });

                setConversations(prev => [newConversation, ...prev]);
                setSelectedConversation(newConversation);
                setSearchParams({ conversation: newConversation.id });
            }
        } catch (error) {
            console.error('Error selecting user:', error);
            alert('Failed to start conversation');
        }
    };

    const handleDeleteConversation = async (conversationId: string) => {
        if (!confirm('Are you sure you want to delete this conversation?')) {
            return;
        }

        try {
            // Find the current user's participant ID in this conversation
            const conversation = conversations.find(c => c.id === conversationId);
            const currentUserParticipant = conversation?.participants.find(
                p => p.user_id === currentUserId
            );

            if (!currentUserParticipant) {
                throw new Error('Participant not found');
            }

            // Call delete API
            await deleteConversation(conversationId, currentUserParticipant.user_id);

            // Remove from local state
            setConversations(prev => prev.filter(c => c.id !== conversationId));

            // Clear selection if this was the selected conversation
            if (selectedConversation?.id === conversationId) {
                setSelectedConversation(null);
                // Clear URL param
                setSearchParams({});
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            alert('Failed to delete conversation. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="chat-page">
                <div className="chat-page__loading">
                    <div className="chat-page__spinner"></div>
                    <p>Loading chat...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-page">
            <div className="chat-page__container">
                {/* Conversation List Sidebar */}
                <div className="chat-page__sidebar">
                    {/* Following Users */}
                    <FollowingList
                        currentUserId={currentUserId}
                        onSelectUser={handleSelectFollowingUser}
                    />

                    <ConversationList
                        conversations={conversations}
                        selectedConversationId={selectedConversation?.id}
                        currentUserId={currentUserId}
                        onSelectConversation={handleSelectConversation}
                        onDeleteConversation={handleDeleteConversation}
                    />

                    {/* New Chat Button */}
                    <button
                        className="chat-page__new-chat-btn"
                        onClick={() => setShowNewChatModal(true)}
                    >
                        ✏️ New Chat
                    </button>
                </div>

                {/* Chat Window */}
                <div className="chat-page__main">
                    {selectedConversation ? (
                        <ChatWindow
                            conversation={selectedConversation}
                            currentUserId={currentUserId}
                            onDeleteConversation={() => handleDeleteConversation(selectedConversation.id)}
                        />
                    ) : (
                        <div className="chat-page__empty">
                            <div className="chat-page__empty-icon">💬</div>
                            <h2>Select a conversation</h2>
                            <p>Choose a conversation from the list or start a new chat</p>
                        </div>
                    )}
                </div>
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="chat-modal-overlay" onClick={() => setShowNewChatModal(false)}>
                    <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="chat-modal__header">
                            <h3>Start New Chat</h3>
                            <button
                                className="chat-modal__close"
                                onClick={() => setShowNewChatModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateNewChat} className="chat-modal__form">
                            <label className="chat-modal__label">
                                User ID
                                <input
                                    type="text"
                                    value={newChatUserId}
                                    onChange={(e) => setNewChatUserId(e.target.value)}
                                    placeholder="Enter user ID to chat with"
                                    className="chat-modal__input"
                                    autoFocus
                                />
                            </label>

                            <div className="chat-modal__actions">
                                <button
                                    type="button"
                                    onClick={() => setShowNewChatModal(false)}
                                    className="chat-modal__btn chat-modal__btn--cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newChatUserId.trim() || isCreatingChat}
                                    className="chat-modal__btn chat-modal__btn--create"
                                >
                                    {isCreatingChat ? 'Creating...' : 'Create Chat'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
