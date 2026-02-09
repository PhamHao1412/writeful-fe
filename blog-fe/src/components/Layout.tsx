import { type ReactNode, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "./Sidebar";
import "../styles/Layout.css";

export function Layout({ children }: { children: ReactNode }) {
    const { isAuthenticated, logout, profile } = useAuth();
    const nav = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const isChatPage = location.pathname === "/chat";

    const handleLogout = () => {
        logout();
        nav("/login");
    };

    return (
        <div className="layout">
            <header className="layout__header">
                <div className={`layout__header-content ${isChatPage ? "layout__header-content--full" : ""}`}>
                    {isAuthenticated && (
                        <button
                            className="layout__toggle-sidebar"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open menu"
                        >
                            ☰
                        </button>
                    )}

                    <Link to="/" className="layout__logo">
                        <span className="layout__logo-icon">✍️</span>
                        <span className="layout__logo-text">Writeful</span>
                    </Link>

                    <div className="layout__actions">
                        {isAuthenticated ? (
                            <>
                                <Link to="/posts/new" className="btn btn--primary btn--sm">
                                    + New Post
                                </Link>
                                <button onClick={handleLogout} className="btn btn--ghost btn--sm">
                                    Sign out
                                </button>
                            </>
                        ) : (
                            <Link to="/login" className="btn btn--primary btn--sm">
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <div className={`layout__body ${isChatPage ? "layout__body--full" : ""}`}>
                {isAuthenticated && (
                    <Sidebar
                        userProfile={profile}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                )}

                <main className={`layout__main ${isChatPage ? "layout__main--nopadding" : ""}`}>
                    <div className={`layout__content ${isChatPage ? "layout__content--full" : ""}`}>{children}</div>
                </main>
            </div>
        </div>
    );
}