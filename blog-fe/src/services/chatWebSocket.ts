import type { Message } from '../api/chat.api';

export interface WebSocketMessage {
    type: 'new_message' | 'typing' | 'read' | 'user_online' | 'user_offline';
    payload: any;
}

export interface TypingPayload {
    conversation_id: string;
    user_id: string;
    is_typing: boolean;
}

type MessageHandler = (data: WebSocketMessage) => void;

class ChatWebSocketService {
    private ws: WebSocket | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isIntentionallyClosed = false;

    connect(token: string, userId: string) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('✅ WebSocket already connected');
            return;
        }

        this.isIntentionallyClosed = false;

        // WebSocket connects directly to chat-service (port 8006) because KrakenD doesn't support WebSocket proxying
        // HTTP APIs go through gateway (port 8080), but WebSocket needs direct connection
        const wsUrl = `ws://localhost:8006/ws?token=${encodeURIComponent(token)}&user_id=${encodeURIComponent(userId)}`;

        console.log('🔌 Attempting WebSocket connection to chat-service...', {
            userId,
            url: wsUrl.replace(/token=[^&]+/, 'token=***') // Hide token in logs
        });

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('✅ WebSocket connected successfully!', { userId, readyState: this.ws?.readyState });
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const data: WebSocketMessage = JSON.parse(event.data);
                console.log('📨 WebSocket message received:', data);

                // Notify all registered handlers
                this.messageHandlers.forEach(handler => {
                    try {
                        handler(data);
                    } catch (error) {
                        console.error('Error in message handler:', error);
                    }
                });
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            this.ws = null;

            // Attempt to reconnect if not intentionally closed
            if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

                setTimeout(() => {
                    this.connect(token, userId);
                }, delay);
            }
        };
    }

    disconnect() {
        this.isIntentionallyClosed = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.messageHandlers.clear();
    }

    /**
     * Register a handler for incoming WebSocket messages
     */
    onMessage(handler: MessageHandler) {
        this.messageHandlers.add(handler);

        // Return unsubscribe function
        return () => {
            this.messageHandlers.delete(handler);
        };
    }

    /**
     * Send typing indicator
     */
    sendTypingIndicator(conversationId: string, userId: string, isTyping: boolean) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: 'typing',
                payload: {
                    conversation_id: conversationId,
                    user_id: userId,
                    is_typing: isTyping
                }
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Export singleton instance
export const chatWebSocket = new ChatWebSocketService();
