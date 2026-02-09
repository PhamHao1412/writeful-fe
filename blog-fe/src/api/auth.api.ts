import { authHttp } from "./http";
import { publicHttp } from "./publicHttp.ts";

export type LoginReq = { email: string; password: string };

interface LoginResponse {
    succeeded: boolean;
    title: string;
    message: string;
    data: {
        access_token: string;
        refresh_token: string;
        exp: number;
    };
    status_code: number;
    errors: null;
    error_code: string;
}

export interface UserProfile {
    id: string;
    email: string;
    username: string;
    status: string;
    is_verified: boolean;
    display_name: string;
    bio: string;
    avatar_url: string;
    roles: Array<{
        id: string;
        code: string;
        name: string;
    }>;
    created_at: string;
    updated_at: string;
}

export type SignUpReq = {
    display_name: string;
    username: string;
    email: string;
    password: string;
}

interface SignUpResponse {
    succeeded: boolean;
    title: string;
    message: string;
    data: any;
    status_code: number;
    errors: null;
    error_code: string;
}

export type UpdateProfilePayload = {
    display_name?: string;
    bio?: string;
    avatar_url?: string;
};

export type GetUserRequest = {
    id?: string;
    username?: string;
    email?: string;
}


export async function login(req: LoginReq): Promise<LoginResponse> {
    const res = await authHttp.post("auth/api/v1/user/login", req);
    return res.data;
}

export async function refreshToken(): Promise<string> {
    const refreshTokenValue = localStorage.getItem('refresh_token');

    if (!refreshTokenValue) {
        throw new Error("No refresh token found");
    }

    const res = await authHttp.post<{
        data: {
            access_token: string;
            refresh_token: string;
        };
    }>("/auth/api/v1/user/refresh", {
        refresh_token: refreshTokenValue,
    });

    if (res.data.data.refresh_token) {
        localStorage.setItem('refresh_token', res.data.data.refresh_token);
    }

    return res.data.data.access_token;
}


export async function logout(): Promise<void> {
    await authHttp.post("/auth/api/v1/user/logout");
}

export async function getProfile(params?: GetUserRequest): Promise<UserProfile> {
    const res = await authHttp.get<{ data: UserProfile }>("/auth/api/v1/user/profile", { params });
    return res.data.data;
}

export async function getUserInfo(username: string): Promise<UserProfile> {
    const res = await publicHttp.get<{ data: UserProfile }>(`/auth/api/v1/user/${username}`);
    return res.data.data;
}



export async function signUp(req: SignUpReq): Promise<SignUpResponse> {
    const res = await authHttp.post("auth/api/v1/user/signup", req);
    return res.data;
}

export async function updateInfo(payload: UpdateProfilePayload): Promise<UserProfile> {
    const res = await authHttp.post<{ data: UserProfile }>("/auth/api/v1/user/update-info", payload);
    return res.data.data;
}

// Follower APIs
export interface FollowerUser {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
}

export interface FollowersResponse {
    data: FollowerUser[];
    total: number;
}

export async function followUser(userId: string): Promise<void> {
    await authHttp.post(`/auth/api/v1/user/follow/${userId}`);
}

export async function unfollowUser(userId: string): Promise<void> {
    await authHttp.delete(`/auth/api/v1/user/unfollow/${userId}`);
}

export async function getFollowers(userId: string): Promise<FollowersResponse> {
    try {
        const res = await authHttp.get<any>(`/auth/api/v1/user/followers/${userId}`);

        // Handle nested data structure: { data: { data: [], total: n } }
        if (res.data?.data && typeof res.data.data === 'object') {
            return {
                data: Array.isArray(res.data.data.data) ? res.data.data.data : (Array.isArray(res.data.data) ? res.data.data : []),
                total: res.data.data.total ?? (Array.isArray(res.data.data.data) ? res.data.data.data.length : (Array.isArray(res.data.data) ? res.data.data.length : 0))
            };
        }

        // Handle direct array: { data: [] }
        if (Array.isArray(res.data?.data)) {
            return {
                data: res.data.data,
                total: res.data.data.length
            };
        }

        // Fallback to empty
        return { data: [], total: 0 };
    } catch (error) {
        console.error('Error fetching followers:', error);
        return { data: [], total: 0 };
    }
}

export async function getFollowing(userId: string): Promise<FollowersResponse> {
    try {
        const res = await authHttp.get<any>(`/auth/api/v1/user/following/${userId}`);

        // Handle nested data structure: { data: { data: [], total: n } }
        if (res.data?.data && typeof res.data.data === 'object') {
            return {
                data: Array.isArray(res.data.data.data) ? res.data.data.data : (Array.isArray(res.data.data) ? res.data.data : []),
                total: res.data.data.total ?? (Array.isArray(res.data.data.data) ? res.data.data.data.length : (Array.isArray(res.data.data) ? res.data.data.length : 0))
            };
        }

        // Handle direct array: { data: [] }
        if (Array.isArray(res.data?.data)) {
            return {
                data: res.data.data,
                total: res.data.data.length
            };
        }

        // Fallback to empty
        return { data: [], total: 0 };
    } catch (error) {
        console.error('Error fetching following:', error);
        return { data: [], total: 0 };
    }
}
