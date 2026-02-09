import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createDraft, getPost, publishPost, updatePost } from "../api/post.api";
import { uploadImages, saveMediaToPost } from "../api/media.api";
import { getProfile } from "../api/auth.api";
import { getErrorMessage } from "../api/http";
import { BlockEditor, type BlockEditorRef, type BlockType } from "../components/BlockEditor";
import "../styles/PostEditor.css";

type Mode = "create" | "edit";

type MediaItem = {
    id: string;
    url: string;
    display_order: number;
};

export default function PostEditorPage() {
    const nav = useNavigate();
    const params = useParams();
    const mode: Mode = useMemo(() => (params.id ? "edit" : "create"), [params.id]);
    const blockEditorRef = useRef<BlockEditorRef>(null);

    const [postId, setPostId] = useState<string | null>(params.id ?? null);
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [content, setContent] = useState("");
    const [coverImageUrl, setCoverImageUrl] = useState<string>("");

    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | null>(null);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // Toolbar state
    const [showStyleDropdown, setShowStyleDropdown] = useState(false);
    const styleDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
                setShowStyleDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function bootstrap() {
        setErr(null);
        try {
            if (mode === "edit" && params.id) {
                const [p, currentUser] = await Promise.all([
                    getPost(params.id),
                    getProfile()
                ]);

                // Check if current user owns this post
                if (p.user_id && currentUser.id !== p.user_id) {
                    setErr("You don't have permission to edit this post");
                    setTimeout(() => nav("/posts"), 2000);
                    return;
                }

                setPostId(p.id);
                setTitle(p.title);
                setSubtitle(p.subtitle || "");
                setContent(p.content);
                if (p.cover_image_url) {
                    setCoverImageUrl(p.cover_image_url);
                }

                // Load media items sorted by display_order
                if (p.media && p.media.length > 0) {
                    const sortedMedia = p.media
                        .sort((a, b) => a.display_order - b.display_order)
                        .map(m => ({
                            id: m.media_id,
                            url: m.url,
                            display_order: m.display_order
                        }));
                    setMediaItems(sortedMedia);
                }
            }
        } catch (e: any) {
            if (e?.response?.status === 401) return nav("/login");
            setErr(getErrorMessage(e));
        } finally {
            setInitialLoadDone(true);
        }
    }

    useEffect(() => {
        bootstrap();
    }, []);

    async function handleCoverImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingCover(true);
        setErr(null);

        try {
            const uploaded = await uploadImages([file]);
            await saveMediaToPost(uploaded);
            setCoverImageUrl(uploaded[0].url);
        } catch (e: any) {
            setErr(getErrorMessage(e));
        } finally {
            setUploadingCover(false);
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setErr(null);

        try {
            const filesArray = Array.from(files);
            const uploaded = await uploadImages(filesArray);

            await saveMediaToPost(uploaded);

            // Add to mediaItems with proper display_order
            const maxOrder = mediaItems.length > 0
                ? Math.max(...mediaItems.map(m => m.display_order))
                : -1;

            const newMediaItems = uploaded.map((img, index) => ({
                id: img.id,
                url: img.url,
                display_order: maxOrder + 1 + index
            }));

            setMediaItems((prev) => [...prev, ...newMediaItems]);

            // Auto-insert images into content
            uploaded.forEach((img) => {
                insertImageAtCursor(img.url);
            });
        } catch (e: any) {
            setErr(getErrorMessage(e));
        } finally {
            setUploading(false);
        }
    }

    function insertImageAtCursor(imageUrl: string) {
        if (blockEditorRef.current) {
            blockEditorRef.current.insertImage(imageUrl);
        } else {
            setContent(prev => prev + `\n![image](${imageUrl})\n`);
        }
    }

    function toggleBlockType(type: BlockType) {
        if (blockEditorRef.current) {
            blockEditorRef.current.toggleBlockType(type);
        }
        setShowStyleDropdown(false);
    }

    function removeMediaItem(id: string) {
        setMediaItems((prev) => {
            const filtered = prev.filter((item) => item.id !== id);
            return filtered.map((item, index) => ({
                ...item,
                display_order: index
            }));
        });
    }

    function removeCoverImage() {
        setCoverImageUrl("");
    }

    async function onSave() {
        setErr(null);
        setSaving(true);
        setAutoSaveStatus("saving");

        try {
            const payload = {
                title: title || "Untitled post",
                subtitle: subtitle || "",
                content: content,
                visibility: "listed",
                cover_image_url: coverImageUrl,
                media_ids: mediaItems.map((item) => item.id),
            };

            if (!postId) {
                const p = await createDraft(payload);
                setPostId(p.id);
                nav(`/posts/${p.id}/edit`, { replace: true });
            } else {
                await updatePost(postId, payload);
            }
            setAutoSaveStatus("saved");
        } catch (e: any) {
            if (e?.response?.status === 401) return nav("/login");
            setErr(getErrorMessage(e));
            setAutoSaveStatus(null);
        } finally {
            setSaving(false);
        }
    }

    async function onPublish() {
        setErr(null);
        setPublishing(true);

        try {
            const payload = {
                title: title || "Untitled post",
                subtitle: subtitle || "",
                content: content,
                visibility: "listed",
                cover_image_url: coverImageUrl,
                media_ids: mediaItems.map((item) => item.id),
            };

            if (!postId) {
                const p = await createDraft(payload);
                await publishPost(p.id);
                nav("/posts");
            } else {
                await updatePost(postId, payload);
                await publishPost(postId);
                nav("/posts");
            }
        } catch (e: any) {
            if (e?.response?.status === 401) return nav("/login");
            setErr(getErrorMessage(e));
        } finally {
            setPublishing(false);
        }
    }

    return (
        <div className="post-editor">
            <header className="post-editor__header">
                <button className="post-editor__back" onClick={() => nav(-1)}>
                    ←
                </button>
                {autoSaveStatus && (
                    <span className={`post-editor__save-status post-editor__save-status--${autoSaveStatus}`}>
                        {autoSaveStatus === "saved" ? "● Saved" : "Saving..."}
                    </span>
                )}
            </header>

            <div className="post-editor__toolbar">
                <div className="post-editor__toolbar-group" ref={styleDropdownRef}>
                    <button
                        className="post-editor__toolbar-btn"
                        onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                    >
                        Style ▼
                    </button>
                    {showStyleDropdown && (
                        <div className="post-editor__style-dropdown">
                            <button onClick={() => toggleBlockType("paragraph")}>¶ Normal text</button>
                            <button onClick={() => toggleBlockType("h1")}>H1 Heading 1</button>
                            <button onClick={() => toggleBlockType("h2")}>H2 Heading 2</button>
                            <button onClick={() => toggleBlockType("h3")}>H3 Heading 3</button>
                        </div>
                    )}
                </div>

                <div className="post-editor__toolbar-divider" />
                <button className="post-editor__toolbar-btn"><strong>B</strong></button>
                <button className="post-editor__toolbar-btn"><em>I</em></button>
                <button className="post-editor__toolbar-btn"><s>S</s></button>
                <button className="post-editor__toolbar-btn">&lt;&gt;</button>
                <button className="post-editor__toolbar-btn">🔗</button>

                <div className="post-editor__toolbar-divider" />

                <label className="post-editor__toolbar-btn post-editor__image-btn" title="Upload Image">
                    Add Image
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} hidden />
                </label>

                <button
                    className="post-editor__toolbar-btn"
                    title="Bulleted List"
                    onClick={() => toggleBlockType("bullet-list")}
                >
                    • List
                </button>
                <button
                    className="post-editor__toolbar-btn"
                    title="Numbered List"
                    onClick={() => toggleBlockType("numbered-list")}
                >
                    1. List
                </button>

                <div className="post-editor__toolbar-spacer" />
            </div>

            {err && <div className="post-editor__error">{err}</div>}

            <div className="post-editor__content">
                <input
                    className="post-editor__title"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <input
                    className="post-editor__subtitle"
                    placeholder="Add a subtitle..."
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                />

                <div className="post-editor__cover">
                    {coverImageUrl ? (
                        <div className="post-editor__cover-preview">
                            <img src={coverImageUrl} alt="Cover" />
                            <button
                                className="post-editor__cover-remove"
                                onClick={removeCoverImage}
                            >
                                ✕ Remove Cover
                            </button>
                        </div>
                    ) : (
                        <label className="post-editor__cover-upload">
                            <span>📷 Add a cover image</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleCoverImageUpload}
                                hidden
                            />
                        </label>
                    )}
                    {uploadingCover && (
                        <div className="post-editor__uploading">Uploading cover...</div>
                    )}
                </div>

                {mediaItems.length > 0 && (
                    <div className="post-editor__media-section">
                        <h3 className="post-editor__media-title">
                            Media Gallery ({mediaItems.length} items) - Click to insert into content
                        </h3>
                        <div className="post-editor__media-grid">
                            {mediaItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="post-editor__media-item"
                                    onClick={() => insertImageAtCursor(item.url)}
                                    title="Click to insert into content"
                                >
                                    <img src={item.url} alt={`Media ${item.display_order + 1}`} />
                                    <div className="post-editor__media-controls">
                                        <button
                                            className="post-editor__media-remove"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeMediaItem(item.id);
                                            }}
                                            title="Remove"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {uploading && <div className="post-editor__uploading">Uploading images...</div>}

                <div className="post-editor__markdown-editor">
                    {initialLoadDone && (
                        <BlockEditor
                            ref={blockEditorRef}
                            initialContent={content}
                            onChange={(val) => setContent(val)}
                        />
                    )}
                </div>
            </div>

            <div className="post-editor__actions">
                <div className="post-editor__actions-container">
                    <button className="btn btn--secondary" onClick={onSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Draft"}
                    </button>
                    <button className="btn btn--primary" onClick={onPublish} disabled={publishing}>
                        {publishing ? "Publishing..." : "Publish"}
                    </button>
                </div>
            </div>
        </div>
    );
}


