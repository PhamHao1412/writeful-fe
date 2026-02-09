import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, type UserProfile } from "../api/auth.api";
import { getErrorMessage } from "../api/http";
import "../styles/Profile.css";

export default function ProfilePage() {
    const nav = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"activity" | "posts" | "likes" | "reads">("activity");

    useEffect(() => {
        async function load() {
            setErr(null);
            setLoading(true);
            try {
                const data = await getProfile();
                setProfile(data);
            } catch (e: any) {
                if (e?.response?.status === 401) return nav("/login");
                setErr(getErrorMessage(e));
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [nav]);

    if (loading) return <div className="profile__loading">Loading...</div>;
    if (err) return <div className="profile__error">{err}</div>;
    if (!profile) return <div className="profile__error">Profile not found</div>;

    return (
        <div className="profile">
            <div className="profile__header">
                <div className="profile__cover">
                    <div className="profile__cover-img" />
                </div>

                <div className="profile__header-content">
                    <div className="profile__info">
                        <div className="profile__info-content">
                            <div className="profile__name">{profile.display_name}</div>
                            <div className="profile__username">{profile.username}</div>
                            <div className="profile__bio">{profile.bio || "No bio yet"}</div>

                            <div className="profile__meta">
                                <div className="profile__meta-item">
                                    <img
                                        src={profile.avatar_url || "https://via.placeholder.com/24"}
                                        alt="Referred by"
                                        className="profile__meta-avatar"
                                    />
                                    <span>Referred by {profile.username}</span>
                                </div>
                                <div className="profile__meta-item">
                                    <span>📅</span>
                                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="profile__subscribers">2 subscribers</div>

                            <div className="profile__actions">
                                <button className="btn btn--primary" onClick={() => nav("/profile/edit")}>
                                    ✏️ Edit Profile
                                </button>
                                <button className="btn btn--secondary btn--icon">🔔</button>
                                <button className="btn btn--secondary btn--icon">⚙️</button>
                                <button className="btn btn--secondary btn--icon">•••</button>
                            </div>
                        </div>

                        <img
                            src={profile.avatar_url || "https://via.placeholder.com/120"}
                            alt={profile.username}
                            className="profile__avatar"
                        />
                    </div>
                </div>
            </div>

            <div className="profile__tabs">
                <button
                    className={`profile__tab ${activeTab === "activity" ? "profile__tab--active" : ""}`}
                    onClick={() => setActiveTab("activity")}
                >
                    Activity (0)
                </button>
                <button
                    className={`profile__tab ${activeTab === "posts" ? "profile__tab--active" : ""}`}
                    onClick={() => setActiveTab("posts")}
                >
                    Posts (0)
                </button>
                <button
                    className={`profile__tab ${activeTab === "likes" ? "profile__tab--active" : ""}`}
                    onClick={() => setActiveTab("likes")}
                >
                    Likes (0)
                </button>
                <button
                    className={`profile__tab ${activeTab === "reads" ? "profile__tab--active" : ""}`}
                    onClick={() => setActiveTab("reads")}
                >
                    Reads (24)
                </button>
            </div>

            <div className="profile__content">
                <div className="profile__compose">
                    <img
                        src={profile.avatar_url || "https://via.placeholder.com/40"}
                        alt={profile.username}
                        className="profile__compose-avatar"
                    />
                    <input
                        type="text"
                        className="profile__compose-input"
                        placeholder="What are you thinking?"
                        readOnly
                    />
                </div>

                <div className="profile__latest">
                    <div className="profile__latest-header">
                        <span className="profile__latest-icon">📊</span>
                        <span className="profile__latest-text">LATEST</span>
                    </div>

                    <div className="profile__empty">
                        <div className="profile__empty-icon">📝</div>
                        <p className="profile__empty-subtitle">No activity yet</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
