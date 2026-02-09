import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { type UserProfile, getProfile } from "../api/auth.api";
import "../styles/Sidebar.css";

interface SidebarProps {
    userProfile?: UserProfile | null;
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ userProfile: propProfile, isOpen = false, onClose }: SidebarProps) {
    const location = useLocation();
    const nav = useNavigate();
    const path = location.pathname;
    const [userProfile, setUserProfile] = useState<UserProfile | null>(propProfile || null);

    useEffect(() => {
        if (propProfile) {
            setUserProfile(propProfile);
        } else {
            // Fallback: Fetch profile if not provided in props (as requested by user)
            getProfile().catch(console.error).then(profile => {
                if (profile) setUserProfile(profile);
            });
        }
    }, [propProfile]);

    const isActive = (route: string) => {
        if (route === "/posts" && (path === "/" || path === "/posts")) return true;
        return path.startsWith(route) && route !== "/posts";
    };

    return (
        <>
            <div
                className={`sidebar__overlay ${isOpen ? "sidebar__overlay--show" : ""}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside className={`sidebar ${isOpen ? "open" : ""}`} aria-label="Main sidebar">
                {/* Logo Area */}
                <div className="sidebar__header">
                    <Link to="/" className="sidebar__logo">
                        <span className="sidebar__logo-icon">
                            {/* Generic Edit/Write Icon */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </span>
                        <span className="sidebar__logo-text">Writeful</span>
                    </Link>
                </div>

                <nav className="sidebar__nav">
                    <Link to="/posts" className={`sidebar__item ${isActive("/posts") ? "sidebar__item--active" : ""}`}>
                        <span className="sidebar__icon">
                            {/* Home Icon (Feather) */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        </span>
                        <span className="sidebar__label">Home</span>
                    </Link>

                    <Link to="/explore" className={`sidebar__item ${isActive("/explore") ? "sidebar__item--active" : ""}`}>
                        <span className="sidebar__icon">
                            {/* Globe/Explore Icon */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        </span>
                        <span className="sidebar__label">Explore</span>
                    </Link>

                    <Link to="/chat" className={`sidebar__item ${isActive("/chat") ? "sidebar__item--active" : ""}`}>
                        <span className="sidebar__icon">
                            {/* Message Circle Icon */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </span>
                        <span className="sidebar__label">Messages</span>
                    </Link>

                    <Link to="/activity" className={`sidebar__item ${isActive("/activity") ? "sidebar__item--active" : ""}`}>
                        <span className="sidebar__icon">
                            {/* Bell Icon (Standard Notification) */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        </span>
                        <span className="sidebar__label">Notifications</span>
                    </Link>

                    <button className="sidebar__create-btn sidebar__item" onClick={() => nav("/posts/new")}>
                        <span className="sidebar__icon">
                            {/* Edit/Create Icon (Pen/Square) */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </span>
                        <span className="sidebar__label">Create</span>
                    </button>

                    {userProfile?.username && (
                        <Link to={`/users/${userProfile.username}`} className={`sidebar__item ${isActive(`/users/${userProfile.username}`) ? "sidebar__item--active" : ""}`}>
                            <span className="sidebar__icon">
                                <img
                                    src={userProfile.avatar_url || "https://ui-avatars.com/api/?name=" + (userProfile.display_name || userProfile.username) + "&background=random"}
                                    alt={userProfile.display_name || userProfile.username || "Profile"}
                                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                                />
                            </span>
                            <span className="sidebar__label">{userProfile.display_name || userProfile.username}</span>
                        </Link>
                    )}
                </nav>

                <div className="sidebar__footer">
                    {/* More Menu */}
                    <button className="sidebar__create-btn sidebar__item">
                        <span className="sidebar__icon">
                            {/* Menu / Hamburger Icon */}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </span>
                        <span className="sidebar__label">More</span>
                    </button>
                </div>
            </aside >
        </>
    );
}
