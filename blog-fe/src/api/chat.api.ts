import { authHttp } from "./http";

// Types
export interface Participant {
    id: string;
    conversation_id: string;
    user_id: string;
    joined_at: string;
    user?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string;
    };
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    type: 'text' | 'image' | 'file';
    content: string;
    media_url?: string;
    created_at: string;
    updated_at: string;
    sender?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url: string;
    };
}

export interface Conversation {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    created_by: string;
    last_message_at?: string;
    participants: Participant[];
    last_message?: Message;
    unread_count: number;
    created_at: string;
    updated_at: string;
}

export interface CreateConversationRequest {
    type: 'direct' | 'group';
    name?: string;
    participant_ids: string[];
}

export interface SendMessageRequest {
    conversation_id: string;
    type: 'text' | 'image' | 'file';
    content: string;
    media_url?: string;
}

export interface GetMessagesParams {
    conversation_id: string;
    page?: number;
    page_size?: number;
}

export interface GetConversationsParams {
    page?: number;
    page_size?: number;
}

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
    total?: number;
}

// API Functions

/**
 * Create a new conversation (direct or group)
 */
export async function createConversation(req: CreateConversationRequest): Promise<Conversation> {
    const res = await authHttp.post<ApiResponse<Conversation>>('/chat/api/v1/conversations', req);
    return res.data.data;
}

/**
 * Get user's conversations with pagination
 */
export async function getConversations(params?: GetConversationsParams): Promise<{ data: Conversation[], total: number }> {
    const res = await authHttp.get<ApiResponse<Conversation[]>>('/chat/api/v1/conversations', { params });
    return {
        data: res.data.data,
        total: res.data.total || res.data.data.length
    };
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
    const res = await authHttp.get<ApiResponse<Conversation>>(`/chat/api/v1/conversations/${conversationId}`);
    return res.data.data;
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(req: SendMessageRequest): Promise<Message> {
    const res = await authHttp.post<ApiResponse<Message>>('/chat/api/v1/messages', req);
    return res.data.data;
}

/**
 * Get messages from a conversation with pagination
 */
export async function getMessages(params: GetMessagesParams): Promise<{ data: Message[], total: number }> {
    const res = await authHttp.get<ApiResponse<Message[]>>('/chat/api/v1/messages', { params });
    return {
        data: res.data.data,
        total: res.data.total || res.data.data.length
    };
}

/**
 * Mark a conversation as read
 */
export async function markConversationAsRead(conversationId: string): Promise<void> {
    await authHttp.post('/chat/api/v1/conversations/read', { conversation_id: conversationId });
}

/**
 * Add participants to a group conversation
 */
export async function addParticipants(conversationId: string, userIds: string[]): Promise<void> {
    await authHttp.post(`/chat/api/v1/conversations/${conversationId}/participants`, { user_ids: userIds });
}

/**
 * Remove a participant from a group conversation
 */
export async function removeParticipant(conversationId: string, userId: string): Promise<void> {
    await authHttp.delete(`/chat/api/v1/conversations/${conversationId}/participants/${userId}`);
}

/**
 * Delete a conversation (leave conversation)
 */
export async function deleteConversation(conversationId: string, participantId: string): Promise<void> {
    await authHttp.delete(`/chat/api/v1/conversations/${conversationId}/participants/${participantId}`);
}
