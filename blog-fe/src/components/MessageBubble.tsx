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

                <div className="message-bubble__content">
                    {message.type === 'text' && (
                        <p className="message-bubble__text">{message.content}</p>
                    )}

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
