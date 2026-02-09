import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getUserInfo,
    getProfile,
    type UserProfile,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    type FollowerUser
} from "../api/auth.api";
import { listPosts, type PostListItem } from "../api/post.api";
import { getErrorMessage } from "../api/http";
import "../styles/UserProfile.css";

export default function UserProfilePage() {
    const nav = useNavigate();
    const { username } = useParams<{ username: string }>();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<PostListItem[]>([]);
    const [followers, setFollowers] = useState<FollowerUser[]>([]);
    const [following, setFollowing] = useState<FollowerUser[]>([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowingBack, setIsFollowingBack] = useState(false);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<"followers" | "following">("followers");
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        async function load() {
            if (!username) return;

            setErr(null);
            setLoading(true);
            try {
                const [profileData, currentUserData] = await Promise.all([
                    getUserInfo(username),
                    getProfile().catch(() => null)
                ]);

                setProfile(profileData);
                setCurrentUser(currentUserData);

                // Load posts, followers, and following counts
                const [postsData, followersData, followingData] = await Promise.all([
                    listPosts({
                        limit: 20,
                        offset: 0,
                        sort: "created_at desc",
                        user_id: profileData.id
                    }),
                    getFollowers(profileData.id),
                    getFollowing(profileData.id)
                ]);

                setPosts(postsData.data || []);

                // Debug logging
                console.log('Followers data:', followersData);
                console.log('Following data:', followingData);

                // Handle both possible response structures
                setFollowerCount(followersData.total ?? followersData.data?.length ?? 0);
                setFollowingCount(followingData.total ?? followingData.data?.length ?? 0);

                // Check if current user is following this profile AND if profile owner follows current user
                if (currentUserData) {
                    const [currentUserFollowing, profileFollowing] = await Promise.all([
                        getFollowing(currentUserData.id),
                        getFollowing(profileData.id)
                    ]);
                    setIsFollowing(currentUserFollowing?.data?.some(u => u.id === profileData.id) ?? false);
                    setIsFollowingBack(profileFollowing?.data?.some(u => u.id === currentUserData.id) ?? false);
                }
            } catch (e: any) {
                if (e?.response?.status === 401) return nav("/login");
                setErr(getErrorMessage(e));
            } finally {
                setLoading(false);
            }
        }


        load();
    }, [username, nav]);

    const handleOpenModal = async (type: "followers" | "following") => {
        if (!profile) return;

        setModalType(type);
        setShowModal(true);
        setModalLoading(true);

        try {
            if (type === "followers") {
                const data = await getFollowers(profile.id);
                setFollowers(data?.data ?? []);
            } else {
                const data = await getFollowing(profile.id);
                setFollowing(data?.data ?? []);
            }
        } catch (e: any) {
            console.error("Error loading modal data:", e);
        } finally {
            setModalLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
    };

    const handleFollowToggle = async () => {
        if (!profile || !currentUser) return;

        setFollowLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser(profile.id);
                setIsFollowing(false);
                setFollowerCount(prev => prev - 1);
            } else {
                await followUser(profile.id);
                setIsFollowing(true);
                setFollowerCount(prev => prev + 1);
            }
        } catch (e: any) {
            console.error("Error toggling follow:", e);
            alert(getErrorMessage(e));
        } finally {
            setFollowLoading(false);
        }
    };

    const isOwnProfile = currentUser?.id === profile?.id;

    if (loading) return <div className="user-profile__loading">Loading...</div>;
    if (err) return <div className="user-profile__error">{err}</div>;
    if (!profile) return <div className="user-profile__error">Profile not found</div>;

    return (
        <div className="user-profile">
            <div className="user-profile__header">
                <div className="user-profile__cover">
                    <div className="user-profile__cover-img" />
                </div>

                <div className="user-profile__header-content">
                    <div className="user-profile__info">
                        <div className="user-profile__info-content">
                            <div className="user-profile__name">{profile.display_name}</div>
                            <div className="user-profile__username">@{profile.username}</div>
                            <div className="user-profile__bio">{profile.bio || "No bio yet"}</div>

                            <div className="user-profile__stats">
                                <button
                                    className="user-profile__stat"
                                    onClick={() => handleOpenModal("followers")}
                                >
                                    <span className="user-profile__stat-count">{followerCount}</span>
                                    <span className="user-profile__stat-label">Followers</span>
                                </button>
                                <button
                                    className="user-profile__stat"
                                    onClick={() => handleOpenModal("following")}
                                >
                                    <span className="user-profile__stat-count">{followingCount}</span>
                                    <span className="user-profile__stat-label">Following</span>
                                </button>
                            </div>

                            <div className="user-profile__meta">
                                <div className="user-profile__meta-item">
                                    <span>📅</span>
                                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="user-profile__actions">
                                {isOwnProfile ? (
                                    <>
                                        <button className="btn btn--primary" onClick={() => nav("/profile/edit")}>
                                            ✏️ Edit Profile
                                        </button>
                                        <button className="btn btn--secondary btn--icon">🔔</button>
                                        <button className="btn btn--secondary btn--icon">⚙️</button>
                                        <button className="btn btn--secondary btn--icon">•••</button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className={`btn ${isFollowing ? 'btn--secondary' : 'btn--primary'}`}
                                            onClick={handleFollowToggle}
                                            disabled={followLoading || !currentUser}
                                        >
                                            {followLoading ? "..." : isFollowing ? "✓ Following" : (isFollowingBack ? "➕ Follow Back" : "➕ Follow")}
                                        </button>
                                        <button className="btn btn--secondary">
                                            💬 Message
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <img
                            src={profile.avatar_url || "https://via.placeholder.com/120"}
                            alt={profile.username}
                            className="user-profile__avatar"
                        />
                    </div>
                </div>
            </div>

            <div className="user-profile__tabs">
                <button className="user-profile__tab user-profile__tab--active">
                    Posts ({posts.length})
                </button>
            </div>

            <div className="user-profile__content">
                {posts.length === 0 ? (
                    <div className="user-profile__empty">
                        <div className="user-profile__empty-icon">📝</div>
                        <p className="user-profile__empty-subtitle">No posts yet</p>
                    </div>
                ) : (
                    <div className="post-list__items">
                        {posts.map((post) => (
                            <article key={post.id} className="post-card" onClick={() => nav(`/posts/${post.id}`)}>
                                <div className="post-card__content">
                                    <h2 className="post-card__title">{post.title || "(Untitled)"}</h2>
                                    <p className="post-card__excerpt">{post.excerpt}</p>
                                    <div className="post-card__meta">
                                        <span>{new Date(post.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {post.cover_image_url && (
                                    <img src={post.cover_image_url} alt={post.title} className="post-card__cover" />
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {/* Followers/Following Modal */}
            {showModal && (
                <div className="user-profile-modal" onClick={handleCloseModal}>
                    <div className="user-profile-modal__content" onClick={(e) => e.stopPropagation()}>
                        <div className="user-profile-modal__header">
                            <h2 className="user-profile-modal__title">
                                {modalType === "followers" ? "Followers" : "Following"}
                            </h2>
                            <button className="user-profile-modal__close" onClick={handleCloseModal}>
                                ✕
                            </button>
                        </div>

                        <div className="user-profile-modal__body">
                            {modalLoading ? (
                                <div className="user-profile-modal__loading">Loading...</div>
                            ) : (
                                <>
                                    {modalType === "followers" && (
                                        followers.length === 0 ? (
                                            <div className="user-profile__empty">
                                                <div className="user-profile__empty-icon">👥</div>
                                                <p className="user-profile__empty-subtitle">No followers yet</p>
                                            </div>
                                        ) : (
                                            <div className="user-profile__user-list">
                                                {followers.map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className="user-profile__user-card"
                                                        onClick={() => {
                                                            handleCloseModal();
                                                            nav(`/users/${user.username}`);
                                                        }}
                                                    >
                                                        <img
                                                            src={user.avatar_url || "https://via.placeholder.com/48"}
                                                            alt={user.username}
                                                            className="user-profile__user-avatar"
                                                        />
                                                        <div className="user-profile__user-info">
                                                            <div className="user-profile__user-name">{user.display_name}</div>
                                                            <div className="user-profile__user-username">{user.username}</div>
                                                            {user.bio && <div className="user-profile__user-bio">{user.bio}</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    )}

                                    {modalType === "following" && (
                                        following.length === 0 ? (
                                            <div className="user-profile__empty">
                                                <div className="user-profile__empty-icon">👥</div>
                                                <p className="user-profile__empty-subtitle">Not following anyone yet</p>
                                            </div>
                                        ) : (
                                            <div className="user-profile__user-list">
                                                {following.map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className="user-profile__user-card"
                                                        onClick={() => {
                                                            handleCloseModal();
                                                            nav(`/users/${user.username}`);
                                                        }}
                                                    >
                                                        <img
                                                            src={user.avatar_url || "https://via.placeholder.com/48"}
                                                            alt={user.username}
                                                            className="user-profile__user-avatar"
                                                        />
                                                        <div className="user-profile__user-info">
                                                            <div className="user-profile__user-name">{user.display_name}</div>
                                                            <div className="user-profile__user-username">{user.username}</div>
                                                            {user.bio && <div className="user-profile__user-bio">{user.bio}</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
