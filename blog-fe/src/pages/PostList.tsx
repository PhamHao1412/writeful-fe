// pages/PostList.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listPosts, type PostListItem } from "../api/post.api";
import { getErrorMessage } from "../api/http";
import "../styles/PostList.css";

type FilterType = "all" | "published" | "drafts";

export default function PostListPage() {
    const nav = useNavigate();
    const [items, setItems] = useState<PostListItem[]>([]);
    const [err, setErr] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>("all");

    async function load() {
        setErr(null);
        try {
            const postsRes = await listPosts({ limit: 20, offset: 0, sort: "created_at desc" });
            setItems(postsRes.data);
        } catch (e: any) {
            if (e?.response?.status === 401) return nav("/login");
            setErr(getErrorMessage(e));
        }
    }

    useEffect(() => {
        load();
    }, []);

    const filteredItems = items.filter((item) => {
        if (filter === "published") return item.status === "published";
        if (filter === "drafts") return item.status === "draft";
        return true;
    });

    return (
        <div className="post-list">
            <main className="post-list__main">
                <header className="post-list__header">
                    <h1 className="post-list__title">For You</h1>
                    <div className="post-list__filter">
                        <button
                            className={`post-list__filter-btn ${filter === "all" ? "post-list__filter-btn--active" : ""}`}
                            onClick={() => setFilter("all")}
                        >
                            All
                        </button>
                        <button
                            className={`post-list__filter-btn ${filter === "published" ? "post-list__filter-btn--active" : ""}`}
                            onClick={() => setFilter("published")}
                        >
                            Published
                        </button>
                        <button
                            className={`post-list__filter-btn ${filter === "drafts" ? "post-list__filter-btn--active" : ""}`}
                            onClick={() => setFilter("drafts")}
                        >
                            Drafts
                        </button>
                    </div>
                </header>

                <div className="create-post-prompt" onClick={() => nav('/posts/new')}>
                    <div className="create-post-prompt__avatar">
                        <span>✍️</span>
                    </div>
                    <div className="create-post-prompt__input">
                        What's on your mind?
                    </div>
                </div>

                {err && <div className="post-list__error">{err}</div>}

                {filteredItems.length === 0 ? (
                    <div className="post-list__empty">
                        <div className="post-list__empty-icon">📝</div>
                        <p className="post-list__empty-title">No posts yet</p>
                        <p className="post-list__empty-subtitle">Start writing your first post</p>
                    </div>
                ) : (
                    <div className="post-list__items">
                        {filteredItems.map((post) => (
                            <article key={post.id} className="post-card" onClick={() => nav(`/posts/${post.id}`)}>
                                <div className="post-card__content">
                                    <div className="post-card__header">
                                        <div
                                            className="post-card__author-info"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                nav(`/users/${post.user.username}`);
                                            }}
                                        >
                                            <img
                                                src={post.user.avatar_url || "https://via.placeholder.com/40"}
                                                alt={post.user.username}
                                                className="post-card__avatar"
                                            />
                                            <div className="post-card__meta-group">
                                                <span className="post-card__author-name">{post.user.display_name}</span>
                                                <span className="post-card__date">{new Date(post.updated_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <span className={`post-card__status post-card__status--${post.status}`}>
                                            {post.status}
                                        </span>
                                    </div>

                                    <h2 className="post-card__title">{post.title || "(Untitled)"}</h2>
                                    <p className="post-card__excerpt">{post.excerpt}</p>

                                    <div className="post-card__footer">
                                        <div className="post-card__action">
                                            <span className="post-card__action-icon">❤️</span>
                                            <span>0</span>
                                        </div>
                                        <div className="post-card__action">
                                            <span className="post-card__action-icon">💬</span>
                                            <span>0</span>
                                        </div>
                                        <div className="post-card__action">
                                            <span className="post-card__action-icon">🔄</span>
                                            <span>0</span>
                                        </div>
                                    </div>
                                </div>

                                {post.cover_image_url && (
                                    <img src={post.cover_image_url} alt={post.title || "Post cover"} className="post-card__cover" />
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
