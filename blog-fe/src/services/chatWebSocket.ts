export interface WebSocketMessage {
    type: 'new_message' | 'typing' | 'read' | 'user_online' | 'user_offline' | 'call_initiate' | 'call_receive' | 'call_ringing' | 'call_reject' | 'call_cancel' | 'call_hangup' | 'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice_candidate';
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

        // Get WebSocket URL from environment variable
        // In production, this should be the Cloudflare Tunnel URL for WebSocket
        // In development, this is ws://localhost:8006
        let wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8006';
        
        // Auto-sanitize protocol: browsers require 'ws://' or 'wss://' schemes
        if (wsBaseUrl.startsWith('https://')) {
            wsBaseUrl = wsBaseUrl.replace('https://', 'wss://');
        } else if (wsBaseUrl.startsWith('http://')) {
            wsBaseUrl = wsBaseUrl.replace('http://', 'ws://');
        }

        const wsUrl = `${wsBaseUrl}/ws?token=${encodeURIComponent(token)}&user_id=${encodeURIComponent(userId)}`;

        console.log('🔌 Attempting WebSocket connection...', {
            userId,
            baseUrl: wsBaseUrl,
            url: wsUrl.replace(/token=[^&]+/, 'token=***') // Hide token in logs
        });

        try {
            this.ws = new WebSocket(wsUrl);
        } catch (err) {
            console.error('❌ Failed to construct WebSocket object. Scheme or syntax issue:', err);
            return;
        }

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

    /**
     * Send WebRTC calling/signaling message
     */
    sendSignalingMessage(type: WebSocketMessage['type'], payload: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type,
                payload
            };
            console.log(`📤 [WebSocket] Sending signaling message type='${type}':`, payload);
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn(`⚠️ [WebSocket WARNING] Cannot send signaling message type='${type}'. Connection not OPEN. ReadyState:`, this.ws?.readyState);
        }
    }
}

// Export singleton instance
export const chatWebSocket = new ChatWebSocketService();
