import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPost, type PostDetail as PostDetailType } from "../api/post.api";
import { getProfile, type UserProfile } from "../api/auth.api";
import { getErrorMessage } from "../api/http";
import MDEditor from "@uiw/react-md-editor";
import "../styles/PostDetail.css";

export default function PostDetailPage() {
    const nav = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [post, setPost] = useState<PostDetailType | null>(null);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (!id) return;

            setLoading(true);
            setErr(null);
            try {
                const [postData, userData] = await Promise.all([
                    getPost(id),
                    getProfile().catch(() => null)
                ]);
                setPost(postData);
                setCurrentUser(userData);
            } catch (e: any) {
                // If 401, we might allow viewing public posts? 
                // But current logic redirects. We'll keep it for now.
                if (e?.response?.status === 401) return nav("/login");
                setErr(getErrorMessage(e));
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [id, nav]);

    if (loading) return (
        <div className="post-detail-loading">
            <div className="post-detail-loading__spinner"></div>
            <p>Loading story...</p>
        </div>
    );
    if (err) return <div className="post-detail-error">{err}</div>;
    if (!post) return <div className="post-detail-error">Post not found</div>;

    const isOwner = post.user_id === currentUser?.id;

    return (
        <article className="post-article" data-color-mode="dark">
            {post.cover_image_url && (
                <div className="post-article__hero">
                    <img src={post.cover_image_url} alt={post.title} className="post-article__hero-img" />
                </div>
            )}

            <div className="post-article__container">
                <header className="post-article__header">
                    <div className="post-article__meta">
                        {isOwner && (
                            <div className="post-article__actions">
                                <Link to={`/posts/${post.id}/edit`} className="btn-edit">
                                    Edit Story
                                </Link>
                                <span className={`status-badge status-${post.status}`}>
                                    {post.status}
                                </span>
                            </div>
                        )}
                    </div>

                    <h1 className="post-article__title">{post.title || "Untitled Story"}</h1>
                    {post.subtitle && (
                        <h2 className="post-article__subtitle">{post.subtitle}</h2>
                    )}

                    <div className="post-article__author-block">
                        <Link to={`/users/${post.user?.username}`} className="post-article__author-avatar-link">
                            <img
                                src={post.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user?.display_name || "User")}&background=random`}
                                alt={post.user?.display_name || "Author"}
                                className="post-article__author-avatar"
                            />
                        </Link>
                        <div className="post-article__author-info">
                            <div className="post-article__author-name">
                                <Link to={`/users/${post.user?.username}`} className="post-article__author-link">
                                    {post.user?.display_name || post.user?.username || "Unknown Author"}
                                </Link>
                            </div>
                            <div className="post-article__publish-date">
                                {post.published_at
                                    ? new Date(post.published_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
                                    : "DRAFT"}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="post-article__content">
                    <MDEditor.Markdown source={post.content || "*No content*"} />
                </div>
            </div>
        </article>
    );
}

