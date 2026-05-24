import type { Message, Participant } from '../api/chat.api';
import '../styles/MessageBubble.css';

interface MessageBubbleProps {
    message: Message;
    isOwnMessage: boolean;
    onReply?: (message: Message) => void;
    participants?: Participant[];
    currentUserId?: string;
}

export default function MessageBubble({ message, isOwnMessage, onReply, participants = [], currentUserId }: MessageBubbleProps) {
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        const timeStr = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        if (isToday) {
            return timeStr;
        }

        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });

        return `${dateStr} at ${timeStr}`;
    };

    const getRepliedTextHeader = () => {
        if (!message.reply_to_message) return '';

        const parentSenderId = message.reply_to_message.sender_id;
        const msgSenderId = message.sender_id;

        const getDisplayName = (userId: string) => {
            const p = participants.find(part => part.user_id === userId);
            return p?.user?.display_name || p?.user?.username || 'User';
        };

        if (isOwnMessage) {
            if (parentSenderId === msgSenderId) {
                return 'Bạn đã trả lời chính mình';
            } else {
                return `Bạn đã trả lời ${getDisplayName(parentSenderId)}`;
            }
        } else {
            const senderName = message.sender?.display_name || getDisplayName(msgSenderId);
            if (parentSenderId === msgSenderId) {
                return `${senderName} đã trả lời chính họ`;
            } else if (currentUserId && parentSenderId === currentUserId) {
                return `${senderName} đã trả lời bạn`;
            } else {
                return `${senderName} đã trả lời ${getDisplayName(parentSenderId)}`;
            }
        }
    };

    const handleScrollToOriginal = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!message.reply_to_message) return;
        
        const element = document.getElementById(`msg-${message.reply_to_message.id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a beautiful pulsing highlight effect
            element.classList.add('message-bubble--highlight');
            setTimeout(() => {
                element.classList.remove('message-bubble--highlight');
            }, 1500);
        }
    };

    return (
        <div className={`message-bubble ${isOwnMessage ? 'message-bubble--own' : 'message-bubble--other'}`}>
            {!isOwnMessage && message.sender && (
                <div className="message-bubble__sender">
                    <img
                        src={message.sender.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender.display_name || message.sender.username || 'Unknown User')}&background=random`}
                        alt={message.sender.display_name}
                        className="message-bubble__avatar"
                        onError={(e) => {
                            const name = message.sender?.display_name || message.sender?.username || 'Unknown User';
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
                        }}
                    />
                </div>
            )}

            <div className="message-bubble__content-wrapper">
                {!isOwnMessage && message.sender && (
                    <div className="message-bubble__name">{message.sender.display_name}</div>
                )}

                {/* Replied parent message preview */}
                {message.reply_to_message && (
                    <div 
                        className="message-bubble__reply-preview"
                        onClick={handleScrollToOriginal}
                        title="Click to view original message"
                    >
                        <div className="message-bubble__reply-header">
                            <span className="message-bubble__reply-icon">↩</span>
                            <span className="message-bubble__reply-title">{getRepliedTextHeader()}</span>
                        </div>
                        <div className="message-bubble__reply-body">
                            {message.reply_to_message.type === 'text' 
                                ? message.reply_to_message.content 
                                : message.reply_to_message.type === 'image' 
                                    ? '📷 Photo' 
                                    : message.reply_to_message.type === 'file' 
                                        ? '📎 File' 
                                        : '📞 Call'}
                        </div>
                    </div>
                )}

                <div className="message-bubble__content-container">
                    <div className={`message-bubble__content ${
                        message.type === 'call' ? 'message-bubble__content--call' : ''
                    } ${
                        message.type === 'image' ? 'message-bubble__content--image' : ''
                    }`}>
                        {message.type === 'text' && (
                            <p className="message-bubble__text">{message.content}</p>
                        )}

                        {message.type === 'call' && (() => {
                            const isMissed = message.content?.toLowerCase().includes('missed');
                            return (
                                <div className={`message-bubble__call ${isMissed ? 'message-bubble__call--missed' : 'message-bubble__call--connected'}`}>
                                    <span className="message-bubble__call-icon">
                                        {isMissed ? (
                                            <svg className="message-bubble__call-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                                                <line x1="23" y1="3" x2="17" y2="9" />
                                                <line x1="17" y1="3" x2="23" y2="9" />
                                            </svg>
                                        ) : (
                                            <svg className="message-bubble__call-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                            </svg>
                                        )}
                                    </span>
                                    <span className="message-bubble__call-text">{message.content}</span>
                                </div>
                            );
                        })()}

                        {message.type === 'image' && message.media_url && (
                            <div className="message-bubble__media">
                                <img src={message.media_url} alt="Shared image" className="message-bubble__image" />
                                {message.content && <p className="message-bubble__text">{message.content}</p>}
                            </div>
                        )}

                        {message.type === 'file' && message.media_url && (
                            <div className="message-bubble__media">
                                <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="message-bubble__file">
                                    📎 {message.content || 'File attachment'}
                                </a>
                            </div>
                        )}

                        <div className="message-bubble__time">{formatTime(message.created_at)}</div>
                    </div>

                    {onReply && message.type !== 'call' && (
                        <button
                            type="button"
                            className="message-bubble__reply-btn"
                            onClick={() => onReply(message)}
                            title="Reply to this message"
                        >
                            ↩
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
