// blog-fe/src/components/ConfirmModal.tsx
import { useEffect, useState } from "react";
import "../styles/ConfirmModal.css";

interface ConfirmEventDetail {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    resolve: (value: boolean) => void;
}

export function ConfirmModal() {
    const [state, setState] = useState<ConfirmEventDetail | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handler = (e: CustomEvent<ConfirmEventDetail>) => {
            setState(e.detail);
            // Small timeout to let the DOM register the modal before open transition
            setTimeout(() => setIsOpen(true), 10);
        };

        window.addEventListener("show-confirm" as any, handler);
        return () => window.removeEventListener("show-confirm" as any, handler);
    }, []);

    const handleConfirm = () => {
        setIsOpen(false);
        setTimeout(() => {
            if (state) {
                state.resolve(true);
            }
            setState(null);
        }, 200);
    };

    const handleCancel = () => {
        setIsOpen(false);
        setTimeout(() => {
            if (state) {
                state.resolve(false);
            }
            setState(null);
        }, 200);
    };

    if (!state) return null;

    return (
        <div className={`confirm-overlay ${isOpen ? "confirm-overlay--open" : ""}`} onClick={handleCancel}>
            <div className={`confirm-modal ${isOpen ? "confirm-modal--open" : ""}`} onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal__icon">⚠️</div>
                <h3 className="confirm-modal__title">{state.title}</h3>
                <p className="confirm-modal__message">{state.message}</p>
                <div className="confirm-modal__actions">
                    <button className="btn-confirm-cancel" onClick={handleCancel}>
                        {state.cancelText || "Cancel"}
                    </button>
                    <button className="btn-confirm-ok" onClick={handleConfirm}>
                        {state.confirmText || "OK"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function showConfirm(
    message: string,
    title: string = "Confirm Action",
    confirmText: string = "Confirm",
    cancelText: string = "Cancel"
): Promise<boolean> {
    return new Promise((resolve) => {
        window.dispatchEvent(
            new CustomEvent("show-confirm", {
                detail: { title, message, confirmText, cancelText, resolve },
            })
        );
    });
}
