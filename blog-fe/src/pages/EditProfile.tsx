import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, updateInfo, type UserProfile } from "../api/auth.api";
import { uploadImages, saveMediaToPost } from "../api/media.api";
import { getErrorMessage } from "../api/http"
import { showToast } from "../components/Toast";
import "../styles/EditProfile.css";

export default function EditProfilePage() {
    const nav = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setErr(null);
            try {
                const data = await getProfile();
                setProfile(data);
                setDisplayName(data.display_name);
                setBio(data.bio || "");
                setAvatarUrl(data.avatar_url);
            } catch (e: any) {
                if (e?.response?.status === 401) return nav("/login");
                setErr(getErrorMessage(e));
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [nav]);

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setErr(null);

        try {
            const uploaded = await uploadImages([file]);
            await saveMediaToPost(uploaded);
            setAvatarUrl(uploaded[0].url);
            showToast("Avatar uploaded successfully!", "success");
        } catch (e: any) {
            setErr(getErrorMessage(e));
            showToast("Failed to upload avatar", "error");
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!displayName.trim()) {
            showToast("Display name is required", "warning");
            return;
        }

        setSaving(true);
        setErr(null);

        try {
            const updated = await updateInfo({
                display_name: displayName,
                bio: bio,
                avatar_url: avatarUrl,
            });
            setProfile(updated);
            showToast("Profile updated successfully!", "success");
            nav("/profile");
        } catch (e: any) {
            if (e?.response?.status === 401) return nav("/login");
            const errorMsg = getErrorMessage(e);
            setErr(errorMsg);
            showToast(errorMsg, "error");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="edit-profile__loading">Loading...</div>;
    if (!profile) return <div className="edit-profile__error">Profile not found</div>;

    return (
        <div className="edit-profile">
            <div className="edit-profile__container">
                <div className="edit-profile__header">
                    <button className="edit-profile__back" onClick={() => nav("/profile")}>
                        ←
                    </button>
                    <h1 className="edit-profile__title">Edit Profile</h1>
                </div>

                <div className="edit-profile__card">
                    <div className="edit-profile__avatar-section">
                        <div className="edit-profile__avatar-preview">
                            <img
                                src={avatarUrl || "https://via.placeholder.com/120"}
                                alt="Avatar"
                                className="edit-profile__avatar"
                            />
                            <label className="edit-profile__avatar-upload">
                                📷
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    hidden
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        {uploading && (
                            <div className="edit-profile__uploading">Uploading avatar...</div>
                        )}
                        <div className="edit-profile__avatar-info">
                            Click the camera icon to change your avatar
                        </div>
                    </div>

                    {err && <div className="edit-profile__error">{err}</div>}

                    <form onSubmit={handleSubmit} className="edit-profile__form">
                        <div className="form-group">
                            <label htmlFor="displayName" className="form-label">
                                Display Name
                            </label>
                            <input
                                id="displayName"
                                type="text"
                                className="form-input"
                                placeholder="Your display name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                disabled={saving}
                                maxLength={50}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="username" className="form-label">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                className="form-input"
                                value={profile.username}
                                disabled
                                style={{ opacity: 0.6, cursor: "not-allowed" }}
                            />
                            <small style={{ color: "#888", fontSize: "0.75rem" }}>
                                Username cannot be changed
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                className="form-input"
                                value={profile.email}
                                disabled
                                style={{ opacity: 0.6, cursor: "not-allowed" }}
                            />
                            <small style={{ color: "#888", fontSize: "0.75rem" }}>
                                Email cannot be changed
                            </small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="bio" className="form-label">
                                Bio
                            </label>
                            <textarea
                                id="bio"
                                className="form-input"
                                placeholder="Tell us about yourself..."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                disabled={saving}
                                rows={4}
                                maxLength={200}
                                style={{ resize: "vertical", minHeight: "100px" }}
                            />
                            <small style={{ color: "#888", fontSize: "0.75rem" }}>
                                {bio.length}/200 characters
                            </small>
                        </div>

                        <div className="edit-profile__actions">
                            <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={() => nav("/profile")}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn--primary"
                                disabled={saving || uploading}
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
