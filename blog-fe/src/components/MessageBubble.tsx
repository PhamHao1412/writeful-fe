import type { Message } from '../api/chat.api';
import '../styles/MessageBubble.css';

interface MessageBubbleProps {
    message: Message;
    isOwnMessage: boolean;
}

export default function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
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

    return (
        <div className={`message-bubble ${isOwnMessage ? 'message-bubble--own' : 'message-bubble--other'}`}>
            {!isOwnMessage && message.sender && (
                <div className="message-bubble__sender">
                    <img
                        src={message.sender.avatar_url || 'https://via.placeholder.com/32'}
                        alt={message.sender.display_name}
                        className="message-bubble__avatar"
                    />
                </div>
            )}

            <div className="message-bubble__content-wrapper">
                {!isOwnMessage && message.sender && (
                    <div className="message-bubble__name">{message.sender.display_name}</div>
                )}

                <div className={`message-bubble__content ${message.type === 'call' ? 'message-bubble__content--call' : ''}`}>
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
            </div>
        </div>
    );
}
