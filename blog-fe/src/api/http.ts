import axios from "axios";
import { refreshToken } from "./auth.api";

export const authHttp = axios.create({
    baseURL: import.meta.env.VITE_BE_GATEWAY_API,
    withCredentials: true,
});

export const contentHttp = axios.create({
    baseURL: import.meta.env.VITE_BE_GATEWAY_API,
    withCredentials: true,
});

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
let isRefreshing = false;
let failedQueue: any[] = [];

function getTokenFromStorage(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

authHttp.interceptors.request.use(
    (config) => {
        const token = getTokenFromStorage();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

contentHttp.interceptors.request.use(
    (config) => {
        const token = getTokenFromStorage();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

const handleAuthError = async (error: any) => {
    const originalRequest = error.config;

    // Nếu refresh token endpoint trả 401 → refresh token đã hết hạn
    if (error.config?.url?.includes('/refresh') && error.response?.status === 401) {
        if (!window.location.pathname.includes('/login')) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(token => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return axios(originalRequest);
            }).catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (!refreshTokenValue) {
            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(REFRESH_TOKEN_KEY);
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        try {
            const newAccessToken = await refreshToken();

            localStorage.setItem(TOKEN_KEY, newAccessToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            authHttp.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
            contentHttp.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

            processQueue(null, newAccessToken);

            return axios(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);

            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(REFRESH_TOKEN_KEY);
                window.location.href = '/login';
            }

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }

    if (error.response?.status === 401 && window.location.pathname.includes('/login')) {
        return Promise.reject(error);
    }

    return Promise.reject(error);
};
authHttp.interceptors.response.use(
    (response) => response,
    handleAuthError
);

contentHttp.interceptors.response.use(
    (response) => response,
    handleAuthError
);

export function getErrorMessage(err: any): string {
    return (
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Unknown error"
    );
}