import type { Conversation } from '../api/chat.api';
import '../styles/ConversationList.css';

interface ConversationListProps {
    conversations: Conversation[];
    selectedConversationId?: string;
    currentUserId: string;
    onSelectConversation: (conversation: Conversation) => void;
    onDeleteConversation: (conversationId: string) => void;
}

export default function ConversationList({
    conversations,
    selectedConversationId,
    currentUserId,
    onSelectConversation,
    onDeleteConversation
}: ConversationListProps) {

    const getConversationName = (conversation: Conversation) => {
        if (conversation.type === 'group' && conversation.name) {
            return conversation.name;
        }

        // For direct messages, show the other participant's name
        const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
        return otherParticipant?.user?.display_name || 'Unknown User';
    };

    const getConversationAvatar = (conversation: Conversation) => {
        if (conversation.type === 'group') {
            return '👥';
        }

        const otherParticipant = conversation.participants.find(p => p.user_id !== currentUserId);
        return otherParticipant?.user?.avatar_url || 'https://via.placeholder.com/48';
    };

    const formatLastMessageTime = (dateString?: string) => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const getLastMessagePreview = (conversation: Conversation) => {
        if (!conversation.last_message) {
            return 'No messages yet';
        }

        const msg = conversation.last_message;
        const isOwnMessage = msg.sender_id === currentUserId;
        const prefix = isOwnMessage ? 'You: ' : '';

        if (msg.type === 'text') {
            return prefix + msg.content;
        } else if (msg.type === 'image') {
            return prefix + '📷 Photo';
        } else if (msg.type === 'file') {
            return prefix + '📎 File';
        }

        return '';
    };

    // Helper function to determine if conversation should show as unread
    // Only show unread if there are unread messages AND the last message is NOT from current user
    const shouldShowAsUnread = (conversation: Conversation) => {
        if (conversation.unread_count <= 0) {
            return false;
        }

        // If last message is from current user, don't show as unread
        if (conversation.last_message?.sender_id === currentUserId) {
            return false;
        }

        return true;
    };

    return (
        <div className="conversation-list">
            <div className="conversation-list__items">
                {conversations.length === 0 ? (
                    <div className="conversation-list__empty">
                        <p>No conversations yet</p>
                        <p className="conversation-list__empty-hint">Start a new chat to get started!</p>
                    </div>
                ) : (
                    conversations.map(conversation => (
                        <div
                            key={conversation.id}
                            className={`conversation-item ${selectedConversationId === conversation.id ? 'conversation-item--active' : ''}`}
                            onClick={() => onSelectConversation(conversation)}
                        >
                            <div className="conversation-item__avatar-wrapper">
                                {typeof getConversationAvatar(conversation) === 'string' && getConversationAvatar(conversation).startsWith('http') ? (
                                    <img
                                        src={getConversationAvatar(conversation)}
                                        alt={getConversationName(conversation)}
                                        className="conversation-item__avatar"
                                    />
                                ) : (
                                    <div className="conversation-item__avatar-emoji">
                                        {getConversationAvatar(conversation)}
                                    </div>
                                )}
                                {shouldShowAsUnread(conversation) && (
                                    <span className="conversation-item__unread-badge">
                                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                                    </span>
                                )}
                            </div>

                            <div className="conversation-item__content">
                                <div className="conversation-item__header">
                                    <h3 className="conversation-item__name">
                                        {getConversationName(conversation)}
                                    </h3>
                                    <span className="conversation-item__time">
                                        {formatLastMessageTime(conversation.last_message_at)}
                                    </span>
                                </div>

                                <p className={`conversation-item__preview ${shouldShowAsUnread(conversation) ? 'conversation-item__preview--unread' : ''}`}>
                                    {getLastMessagePreview(conversation)}
                                </p>
                            </div>

                            <button
                                className="conversation-item__delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteConversation(conversation.id);
                                }}
                                title="Delete conversation"
                            >
                                🗑️
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
