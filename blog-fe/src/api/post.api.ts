import { contentHttp } from "./http";

export type PostStatus = "draft" | "published";
export type PostVisibility = "listed" | "unlisted";

export type PostListItem = {
    id: string;
    user_id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    status: PostStatus;
    published_at: string | null;
    cover_image_url: string | null;
    user: {
        id: string;
        username: string;
        email: string;
        status: string;
        display_name: string;
        avatar_url: string;
        roles: Array<{
            code: string;
            name: string;
        }>;
    };
    version: number;
    created_at: string;
    updated_at: string;
};

export type PostDetail = {
    id: string;
    user_id: string;
    title: string;
    subtitle: string;
    content: string;
    slug: string;
    status: PostStatus;
    visibility: PostVisibility;
    published_at: string | null;
    cover_image_url: string;
    media?: Array<{
        post_id: string;
        media_id: string;
        url: string;
        display_order: number;
    }>;
    user?: {
        id: string;
        username: string;
        email: string;
        status: string;
        display_name: string;
        avatar_url: string;
        roles: Array<{
            code: string;
            name: string;
        }>;
    };
};

export type CreatePostPayload = {
    title: string;
    subtitle?: string;
    content: string;
    visibility: string;
    excerpt?: string;
    cover_image_url?: string;
    media_ids?: string[];
};

export type GetPostListParams = {
    limit?: number;
    offset?: number;
    sort?: string;
    status?: string;
    user_id?: string;
};

export async function listPosts(params?: GetPostListParams) {
    const res = await contentHttp.get("content/api/v1/post", { params });
    return res.data as {
        succeeded: boolean;
        title: string;
        message: string;
        data: PostListItem[];
        total: number;
        status_code: number;
        errors: any;
        error_code: string;
    };
}

export async function createDraft(payload: CreatePostPayload) {
    const res = await contentHttp.post("content/api/v1/post", payload);
    return res.data as PostDetail;
}

export async function getPost(id: string) {
    const res = await contentHttp.get(`/content/api/v1/post/${id}`);
    return res.data as PostDetail;
}

export async function updatePost(id: string, payload: CreatePostPayload) {
    const res = await contentHttp.put(`content/api/v1/post/${id}`, payload);
    return res.data;
}

export async function publishPost(id: string) {
    const res = await contentHttp.post(`content/api/v1/post/${id}/publish`, {});
    return res.data;
}

export async function unpublishPost(id: string) {
    const res = await contentHttp.put(`/posts/${id}/unpublish`, {});
    return res.data;
}
