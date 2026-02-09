// blog-fe/src/components/Toast.tsx
import { useEffect, useState } from "react";
import "../styles/Toast.css";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`toast toast--${type} ${isExiting ? "toast--exit" : ""}`}>
            <div className="toast__icon">
                {type === "success" && "✓"}
                {type === "error" && "✕"}
                {type === "warning" && "⚠"}
                {type === "info" && "ℹ"}
            </div>
            <div className="toast__message">{message}</div>
            <button className="toast__close" onClick={() => { setIsExiting(true); setTimeout(onClose, 300); }}>
                ✕
            </button>
        </div>
    );
}

// Toast container
interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const handler = (e: CustomEvent<{ message: string; type: ToastType }>) => {
            const newToast: ToastItem = {
                id: Math.random().toString(36),
                message: e.detail.message,
                type: e.detail.type,
            };
            setToasts((prev) => [...prev, newToast]);
        };

        window.addEventListener("show-toast" as any, handler);
        return () => window.removeEventListener("show-toast" as any, handler);
    }, []);

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                />
            ))}
        </div>
    );
}

// Helper function
export function showToast(message: string, type: ToastType = "info") {
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message, type } }));
}