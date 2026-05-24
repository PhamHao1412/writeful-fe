// src/components/StoryCreatorModal.tsx
import React, { useEffect, useState, useRef } from "react";
import { storyApi, type MusicTrack } from "../api/story.api";
import { showToast } from "./Toast";
import "../styles/Stories.css";

interface StoryCreatorModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type GenreType = "all" | "vpop" | "pop" | "lofi" | "acoustic";

export function StoryCreatorModal({ onClose, onSuccess }: StoryCreatorModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  // Music state
  const [isMusicDrawerOpen, setIsMusicDrawerOpen] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<GenreType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Music player for previews
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Custom Music Upload state
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customArtist, setCustomArtist] = useState("");
  const [customGenre, setCustomGenre] = useState<string>("vpop");
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMusicDrawerOpen) {
      loadTracks();
    }
  }, [isMusicDrawerOpen, selectedGenre]);

  const loadTracks = async (search?: string) => {
    try {
      const res = await storyApi.getMusics(selectedGenre === "all" ? undefined : selectedGenre, search);
      if (res.data?.data) {
        setTracks(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load music tracks:", err);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    loadTracks(val);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showToast("Please select an image file.", "error");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Music Previews Play/Pause
  const handlePlayPreview = (track: MusicTrack) => {
    if (!track.url) return;

    if (previewTrackId === track.id) {
      // Pause
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPreviewTrackId(null);
    } else {
      // Play new
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const player = new Audio(track.url);
      player.volume = 0.5;
      player.play().catch(e => console.error("Audio play failed:", e));
      player.onended = () => setPreviewTrackId(null);
      
      audioPlayerRef.current = player;
      setPreviewTrackId(track.id || track.title);
    }
  };

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const handleSelectTrack = (track: MusicTrack) => {
    setSelectedTrack(track);
    setIsMusicDrawerOpen(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPreviewTrackId(null);
    }
    showToast(`Added track: ${track.title}`, "success");
  };

  // Custom MP3 Contribution Upload
  const handleCustomAudioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAudioFile || !customTitle || !customArtist) {
      showToast("Please fill in all music fields and select an MP3 file.", "warning");
      return;
    }

    setUploadingAudio(true);
    try {
      showToast("Uploading MP3 file to server library...", "info");
      // 1. Upload to Cloudinary
      const uploadRes = await storyApi.uploadAudio(customAudioFile);
      const audioUrl = uploadRes.data?.data?.url;
      if (!audioUrl) throw new Error("Failed to get audio URL from media-service");

      // 2. Add to global Database catalog
      const addRes = await storyApi.addMusic({
        title: customTitle,
        artist: customArtist,
        url: audioUrl,
        genre: customGenre,
        cover_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150" // premium mic/vinyl default cover
      });

      const newTrack = addRes.data?.data;
      if (newTrack) {
        showToast("Music uploaded and added to Shared Catalog!", "success");
        // Reset custom music uploader form
        setCustomAudioFile(null);
        setCustomTitle("");
        setCustomArtist("");
        setIsUploadMode(false);
        // Automatically select the newly created track!
        handleSelectTrack(newTrack);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to upload music track.", "error");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handlePublish = async () => {
    if (!imageFile) {
      showToast("Please choose a photo for your Story.", "warning");
      return;
    }

    setLoading(true);
    try {
      showToast("Uploading story photo...", "info");
      // 1. Upload photo via media-service using the video/upload endpoint or image upload
      // In Writeful, images are uploaded through a standard formData via media-service.
      // Let's create an upload form and POST to /media/api/v1/image/upload
      const formData = new FormData();
      formData.append("files", imageFile); // images are sent in array form under "files"
      
      // Let's call standard axios client image upload
      // Since storyApi doesn't have image upload explicitly defined, let's call it via direct axios endpoint:
      const imgRes = await storyApi.uploadAudio(imageFile); // uploadAudio uses the multipart video endpoint which Cloudinary supports for both image/video/raw! Or we can direct post:
      const photoUrl = imgRes.data?.data?.url;
      if (!photoUrl) throw new Error("Failed to upload story image");

      // 2. Publish story
      await storyApi.createStory({
        media_url: photoUrl,
        caption: caption,
        audio_url: selectedTrack?.url || undefined,
        audio_title: selectedTrack?.title || undefined,
        audio_artist: selectedTrack?.artist || undefined,
      });

      showToast("Story published successfully for 24h!", "success");
      onSuccess();
    } catch (err) {
      console.error(err);
      showToast("Failed to publish Story.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="story-creator-overlay" onClick={() => {
      if (!isMusicDrawerOpen) onClose();
    }}>
      <div className="story-creator" onClick={e => e.stopPropagation()}>
        <header className="story-creator__header">
          <h2 className="story-creator__title">Create Story</h2>
          <button className="story-creator__close" onClick={onClose}>&times;</button>
        </header>

        <div className="story-creator__content">
          {!imagePreview ? (
            <div className="story-creator__dropzone" onClick={() => fileInputRef.current?.click()}>
              <div className="story-creator__dropzone-icon">📸</div>
              <p style={{ fontWeight: 600 }}>Share a Photo Story</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>Click to select an image</p>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>
          ) : (
            <div className="story-creator__preview-container">
              <img src={imagePreview} alt="Preview" className="story-creator__preview" />
              {selectedTrack && (
                <div className="story-creator__music-pill">
                  <span>🎵</span>
                  <strong style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                    {selectedTrack.title}
                  </strong>
                  <span style={{ fontSize: "10px", opacity: 0.8 }}>({selectedTrack.artist})</span>
                  <button
                    style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "14px", marginLeft: "4px" }}
                    onClick={() => setSelectedTrack(null)}
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
          )}

          {imagePreview && (
            <div className="story-creator__form">
              <input
                type="text"
                placeholder="Write a caption... (Optional)"
                className="story-creator__input"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                maxLength={100}
              />

              <div className="story-creator__actions">
                <button
                  type="button"
                  className="story-creator__btn story-creator__btn--music"
                  onClick={() => setIsMusicDrawerOpen(true)}
                >
                  🎵 {selectedTrack ? "Change Music" : "Add Music"}
                </button>
                
                <button
                  type="button"
                  className="story-creator__btn story-creator__btn--publish"
                  onClick={handlePublish}
                  disabled={loading}
                >
                  {loading ? "Publishing..." : "Share to Story"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Music Selector Drawer */}
        <div className={`music-drawer ${isMusicDrawerOpen ? "music-drawer--open" : ""}`}>
          <div className="music-drawer__header">
            <h3 className="music-drawer__title">{isUploadMode ? "Upload MP3 to Server Library" : "Select Story Music"}</h3>
            <button className="music-drawer__close" onClick={() => {
              setIsMusicDrawerOpen(false);
              setIsUploadMode(false);
            }}>&times;</button>
          </div>

          {!isUploadMode ? (
            <>
              <input
                type="text"
                placeholder="Search songs or artists..."
                className="music-drawer__search"
                value={searchQuery}
                onChange={handleSearchChange}
              />

              <div className="music-drawer__tabs">
                {(["all", "vpop", "pop", "lofi", "acoustic"] as GenreType[]).map((tab) => (
                  <button
                    key={tab}
                    className={`music-drawer__tab ${selectedGenre === tab ? "music-drawer__tab--active" : ""}`}
                    onClick={() => setSelectedGenre(tab)}
                  >
                    {tab === "all" ? "🎵 All" : tab === "vpop" ? "🇻🇳 V-Pop" : tab === "pop" ? "✨ Pop" : tab === "lofi" ? "🎧 Chill" : "🎸 Acoustic"}
                  </button>
                ))}
              </div>

              <div className="music-drawer__list">
                {/* Custom Music Upload Trigger Card */}
                <div className="music-drawer__upload-card" onClick={() => setIsUploadMode(true)}>
                  <span style={{ fontSize: "20px" }}>☁️</span>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Tải nhạc MP3 lên kho dùng chung</span>
                  <span style={{ fontSize: "11px", opacity: 0.7 }}>Chia sẻ bản nhạc của riêng bạn với server</span>
                </div>

                {tracks.map((track) => (
                  <div key={track.id || track.title} className="track-item">
                    <div className="track-item__meta">
                      <img
                        src={track.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100"}
                        alt={track.title}
                        className="track-item__cover"
                      />
                      <div className="track-item__details">
                        <span className="track-item__title">{track.title}</span>
                        <span className="track-item__artist">{track.artist}</span>
                      </div>
                    </div>
                    <div className="track-item__actions">
                      <button
                        type="button"
                        className="track-item__btn"
                        onClick={() => handlePlayPreview(track)}
                      >
                        {previewTrackId === (track.id || track.title) ? "⏸️" : "▶️"}
                      </button>
                      <button
                        type="button"
                        className="track-item__btn track-item__btn--select"
                        onClick={() => handleSelectTrack(track)}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form className="music-drawer__upload-form" onSubmit={handleCustomAudioSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>Chọn file MP3 (.mp3)</label>
                <input
                  type="file"
                  accept="audio/mp3, audio/*"
                  ref={audioInputRef}
                  onChange={e => setCustomAudioFile(e.target.files?.[0] || null)}
                  className="music-drawer__upload-input"
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>Tên bài hát</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chúng Ta Của Tương Lai"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  className="music-drawer__upload-input"
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>Nghệ sĩ / Ca sĩ</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Sơn Tùng M-TP"
                  value={customArtist}
                  onChange={e => setCustomArtist(e.target.value)}
                  className="music-drawer__upload-input"
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>Thể loại</label>
                <select
                  value={customGenre}
                  onChange={e => setCustomGenre(e.target.value)}
                  className="music-drawer__upload-input"
                  style={{ background: "#222" }}
                >
                  <option value="vpop">🇻🇳 V-Pop</option>
                  <option value="pop">✨ Pop / International</option>
                  <option value="lofi">🎧 Lofi / Chill</option>
                  <option value="acoustic">🎸 Acoustic</option>
                </select>
              </div>

              <div className="music-drawer__upload-actions" style={{ marginTop: "12px" }}>
                <button
                  type="button"
                  className="music-drawer__upload-btn music-drawer__upload-btn--cancel"
                  onClick={() => setIsUploadMode(false)}
                  disabled={uploadingAudio}
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="music-drawer__upload-btn music-drawer__upload-btn--submit"
                  disabled={uploadingAudio}
                >
                  {uploadingAudio ? "Đang tải lên..." : "Tải lên thư viện chung"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
