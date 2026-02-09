import axios from "axios";

export const publicHttp = axios.create({
    baseURL: import.meta.env.VITE_BE_GATEWAY_API,
    withCredentials: true,
});
