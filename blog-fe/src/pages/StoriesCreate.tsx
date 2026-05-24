// src/pages/StoriesCreate.tsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { storyApi, type MusicTrack } from "../api/story.api";
import { useAuth } from "../contexts/AuthContext";
import { showToast } from "../components/Toast";
import "../styles/Stories.css";

type GenreType = "all" | "vpop" | "pop" | "lofi" | "acoustic";

export default function StoriesCreate() {
  const nav = useNavigate();
  const { profile } = useAuth();

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

  // Audio trimmer states & refs
  const [audioOffset, setAudioOffset] = useState<number>(0);
  const [trackDuration, setTrackDuration] = useState<number>(60);
  const [isTrimPlayerPlaying, setIsTrimPlayerPlaying] = useState<boolean>(false);
  const audioOffsetRef = useRef<number>(0);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

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

    // Reset trimmer preview state
    setIsTrimPlayerPlaying(false);

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
    setAudioOffset(0);
    audioOffsetRef.current = 0;
    setIsTrimPlayerPlaying(false);
    setIsMusicDrawerOpen(false);
    
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setPreviewTrackId(null);

    // Fetch song length metadata dynamically
    if (track.url) {
      const temp = new Audio(track.url);
      temp.addEventListener("loadedmetadata", () => {
        setTrackDuration(temp.duration || 60);
      });
    }
    showToast(`Added track: ${track.title}`, "success");
  };

  const handleToggleTrimPlay = () => {
    if (!selectedTrack?.url) return;

    // Reset drawer preview if active
    setPreviewTrackId(null);

    if (isTrimPlayerPlaying) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setIsTrimPlayerPlaying(false);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      
      const player = new Audio(selectedTrack.url);
      player.volume = 0.5;
      player.currentTime = audioOffset;
      
      player.addEventListener("timeupdate", () => {
        const currentOffset = audioOffsetRef.current;
        if (player.currentTime >= currentOffset + 10) {
          player.currentTime = currentOffset;
        }
        if (player.currentTime < currentOffset) {
          player.currentTime = currentOffset;
        }
      });
      
      player.play()
        .then(() => {
          setIsTrimPlayerPlaying(true);
        })
        .catch(e => console.error("Audio play failed:", e));
      
      player.onended = () => {
        setIsTrimPlayerPlaying(false);
      };
      
      audioPlayerRef.current = player;
    }
  };

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioOffset(val);
    audioOffsetRef.current = val;
    
    if (audioPlayerRef.current && isTrimPlayerPlaying) {
      audioPlayerRef.current.currentTime = val;
    }
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
        cover_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150" // default microphone cover
      });

      const newTrack = addRes.data?.data;
      if (newTrack) {
        showToast("Music uploaded and added to Shared Catalog!", "success");
        // Reset custom music uploader form
        setCustomAudioFile(null);
        setCustomTitle("");
        setCustomArtist("");
        setIsUploadMode(false);
        // Automatically select the newly created track
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
      // 1. Upload photo via media-service using the video/upload endpoint
      const imgRes = await storyApi.uploadAudio(imageFile);
      const photoUrl = imgRes.data?.data?.url;
      if (!photoUrl) throw new Error("Failed to upload story image");

      // 2. Publish story
      await storyApi.createStory({
        media_url: photoUrl,
        caption: caption,
        audio_url: selectedTrack?.url || undefined,
        audio_title: selectedTrack?.title || undefined,
        audio_artist: selectedTrack?.artist || undefined,
        audio_offset: selectedTrack ? Math.floor(audioOffset) : undefined,
      });

      showToast("Story published successfully for 24h!", "success");
      
      // Clear music preview playing
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      
      nav("/posts"); // Redirect to main posts list feed
    } catch (err) {
      console.error(err);
      showToast("Failed to publish Story.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="story-creator-page">
      {/* Sidebar Control Panel */}
      <div className="story-creator-page__sidebar">
        <header className="story-creator-page__sidebar-header">
          <h2 className="story-creator-page__sidebar-title">Create Story</h2>
          <button 
            className="story-creator-page__exit-btn" 
            onClick={() => {
              if (audioPlayerRef.current) audioPlayerRef.current.pause();
              nav("/posts");
            }} 
            title="Exit to feed"
          >
            ✕
          </button>
        </header>

        <div className="story-creator-page__sidebar-content">
          {/* Step 1: Choose Photo */}
          {!imagePreview ? (
            <div className="story-creator-page__section">
              <label className="story-creator-page__section-title">Step 1: Choose Photo</label>
              <div className="story-creator-page__upload-dropzone" onClick={() => fileInputRef.current?.click()}>
                <div className="story-creator-page__dropzone-icon">📸</div>
                <p style={{ fontWeight: 600, fontSize: "14px" }}>Share a Photo Story</p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>Click to select an image</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          ) : (
            <div className="story-creator-page__section">
              <label className="story-creator-page__section-title">Step 1: Selected Photo</label>
              <div className="story-creator-page__photo-thumbnail-card">
                <img src={imagePreview} alt="Selected" className="story-creator-page__photo-thumbnail" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "4px" }}>
                    Image chosen successfully
                  </span>
                  <button 
                    type="button" 
                    className="story-creator-page__replace-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Replace Photo
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          )}

          {/* Step 2: Add Caption & Music */}
          {imagePreview && (
            <>
              <div className="story-creator-page__section">
                <label className="story-creator-page__section-title">Step 2: Add Caption</label>
                <input
                  type="text"
                  placeholder="Write a caption... (Optional)"
                  className="story-creator-page__caption-input"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={100}
                />
                <span className="story-creator-page__char-counter">{caption.length}/100</span>
              </div>

              <div className="story-creator-page__section">
                <label className="story-creator-page__section-title">Step 3: Background Soundtrack</label>
                {!selectedTrack ? (
                  <button
                    type="button"
                    className="story-creator-page__music-trigger-btn"
                    onClick={() => setIsMusicDrawerOpen(true)}
                  >
                    🎵 Add Music
                  </button>
                ) : (
                  <>
                    <div className="story-creator-page__selected-music-card">
                      <img 
                        src={selectedTrack.cover_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150"} 
                        alt="Album Cover" 
                        className="story-creator-page__selected-music-cover"
                      />
                      <div className="story-creator-page__selected-music-info">
                        <span className="story-creator-page__selected-music-title">{selectedTrack.title}</span>
                        <span className="story-creator-page__selected-music-artist">{selectedTrack.artist}</span>
                      </div>
                      <button
                        type="button"
                        className="story-creator-page__remove-music-btn"
                        onClick={() => {
                          setSelectedTrack(null);
                          setAudioOffset(0);
                          audioOffsetRef.current = 0;
                          setIsTrimPlayerPlaying(false);
                          if (audioPlayerRef.current) {
                            audioPlayerRef.current.pause();
                            audioPlayerRef.current = null;
                          }
                          setPreviewTrackId(null);
                        }}
                        title="Remove soundtrack"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Timeline Trimmer Section */}
                    <div className="story-creator-page__trimmer">
                      <div className="story-creator-page__trimmer-header">
                        <span className="story-creator-page__trimmer-title">🎵 Đoạn nhạc phát (10 giây)</span>
                        <button
                          type="button"
                          className="story-creator-page__trimmer-play-btn"
                          onClick={handleToggleTrimPlay}
                          title={isTrimPlayerPlaying ? "Pause preview" : "Play preview segment"}
                        >
                          {isTrimPlayerPlaying ? "⏸️" : "▶️"}
                        </button>
                      </div>
                      
                      <div className="story-creator-page__trimmer-slider-container">
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, trackDuration - 10)}
                          step={1}
                          value={audioOffset}
                          onChange={handleOffsetChange}
                          className="story-creator-page__trimmer-slider"
                        />
                        <div className="story-creator-page__trimmer-timeinfo">
                          <span>{formatTime(audioOffset)}</span>
                          <span>{formatTime(audioOffset + 10)}</span>
                        </div>
                        <div className="story-creator-page__trimmer-duration">
                          Độ dài bài hát: {formatTime(trackDuration)}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Publish Bar */}
        <div className="story-creator-page__sidebar-footer">
          <button
            type="button"
            className="story-creator-page__publish-btn"
            onClick={handlePublish}
            disabled={loading || !imageFile}
          >
            {loading ? "Publishing..." : "Share to Story"}
          </button>
        </div>

        {/* Slide-in Music Selector Panel */}
        <div className={`story-creator-page__music-drawer ${isMusicDrawerOpen ? "story-creator-page__music-drawer--open" : ""}`}>
          <div className="story-creator-page__music-drawer-header">
            <h3 className="story-creator-page__music-drawer-title">
              {isUploadMode ? "Upload MP3 Track" : "Choose Story Music"}
            </h3>
            <button 
              className="story-creator-page__music-drawer-close" 
              onClick={() => {
                setIsMusicDrawerOpen(false);
                setIsUploadMode(false);
              }}
            >
              &times;
            </button>
          </div>

          {!isUploadMode ? (
            <div className="story-creator-page__music-drawer-content">
              <input
                type="text"
                placeholder="Search songs or artists..."
                className="story-creator-page__music-search"
                value={searchQuery}
                onChange={handleSearchChange}
              />

              <div className="story-creator-page__music-tabs">
                {(["all", "vpop", "pop", "lofi", "acoustic"] as GenreType[]).map((tab) => (
                  <button
                    key={tab}
                    className={`story-creator-page__music-tab ${selectedGenre === tab ? "story-creator-page__music-tab--active" : ""}`}
                    onClick={() => setSelectedGenre(tab)}
                  >
                    {tab === "all" ? "🎵 All" : tab === "vpop" ? "🇻🇳 V-Pop" : tab === "pop" ? "✨ Pop" : tab === "lofi" ? "🎧 Chill" : "🎸 Acoustic"}
                  </button>
                ))}
              </div>

              <div className="story-creator-page__music-list">
                {/* Custom Music Upload card trigger */}
                <div className="story-creator-page__music-upload-card" onClick={() => setIsUploadMode(true)}>
                  <span style={{ fontSize: "20px" }}>☁️</span>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 600, display: "block" }}>Upload custom MP3 file</span>
                    <span style={{ fontSize: "11px", opacity: 0.7 }}>Contribute audio to shared server library</span>
                  </div>
                </div>

                {tracks.map((track) => (
                  <div key={track.id || track.title} className="story-creator-page__track-item">
                    <div className="story-creator-page__track-meta">
                      <img
                        src={track.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100"}
                        alt={track.title}
                        className="story-creator-page__track-cover"
                      />
                      <div className="story-creator-page__track-details">
                        <span className="story-creator-page__track-title">{track.title}</span>
                        <span className="story-creator-page__track-artist">{track.artist}</span>
                      </div>
                    </div>
                    <div className="story-creator-page__track-actions">
                      <button
                        type="button"
                        className="story-creator-page__track-play-btn"
                        onClick={() => handlePlayPreview(track)}
                        title="Preview audio"
                      >
                        {previewTrackId === (track.id || track.title) ? "⏸️" : "▶️"}
                      </button>
                      <button
                        type="button"
                        className="story-creator-page__track-select-btn"
                        onClick={() => handleSelectTrack(track)}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="story-creator-page__music-drawer-content" style={{ overflowY: "auto" }}>
              <form className="story-creator-page__upload-form" onSubmit={handleCustomAudioSubmit}>
                <div className="story-creator-page__upload-field">
                  <label>Select MP3 File (.mp3)</label>
                  <input
                    type="file"
                    accept="audio/mp3, audio/*"
                    ref={audioInputRef}
                    onChange={e => setCustomAudioFile(e.target.files?.[0] || null)}
                    className="story-creator-page__upload-input"
                    required
                  />
                </div>

                <div className="story-creator-page__upload-field">
                  <label>Track Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Chúng Ta Của Tương Lai"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    className="story-creator-page__upload-input"
                    required
                  />
                </div>

                <div className="story-creator-page__upload-field">
                  <label>Artist / Singer</label>
                  <input
                    type="text"
                    placeholder="e.g. Sơn Tùng M-TP"
                    value={customArtist}
                    onChange={e => setCustomArtist(e.target.value)}
                    className="story-creator-page__upload-input"
                    required
                  />
                </div>

                <div className="story-creator-page__upload-field">
                  <label>Genre</label>
                  <select
                    value={customGenre}
                    onChange={e => setCustomGenre(e.target.value)}
                    className="story-creator-page__upload-input"
                    style={{ background: "#2a2b2c" }}
                  >
                    <option value="vpop">🇻🇳 V-Pop</option>
                    <option value="pop">✨ Pop / International</option>
                    <option value="lofi">🎧 Lofi / Chill</option>
                    <option value="acoustic">🎸 Acoustic</option>
                  </select>
                </div>

                <div className="story-creator-page__upload-actions">
                  <button
                    type="button"
                    className="story-creator-page__upload-btn story-creator-page__upload-btn--cancel"
                    onClick={() => setIsUploadMode(false)}
                    disabled={uploadingAudio}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="story-creator-page__upload-btn story-creator-page__upload-btn--submit"
                    disabled={uploadingAudio}
                  >
                    {uploadingAudio ? "Uploading..." : "Add to Library"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Live Mockup Screen Preview Pane */}
      <div className="story-creator-page__preview-area">
        <div className="story-creator-page__phone-frame">
          <div className="story-creator-page__preview-screen">
            {imagePreview ? (
              <>
                {/* 10s progress bar at the top */}
                <div className="story-creator-page__preview-bars">
                  <div className="story-creator-page__preview-bar-track">
                    <div className="story-creator-page__preview-bar-fill"></div>
                  </div>
                </div>

                {/* Creator header info */}
                <div className="story-creator-page__preview-user">
                  <img 
                    src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"} 
                    alt="Avatar" 
                    className="story-creator-page__preview-user-avatar"
                  />
                  <div className="story-creator-page__preview-user-meta">
                    <span className="story-creator-page__preview-user-name">
                      {profile?.display_name || profile?.username || "You"}
                    </span>
                    <span className="story-creator-page__preview-user-time">Just now</span>
                  </div>
                </div>

                {/* Main Selected Image */}
                <img src={imagePreview} alt="Mockup" className="story-creator-page__preview-image" />

                {/* Glowing Floating Music Vinyl Badge */}
                {selectedTrack && (
                  <div className="story-creator-page__preview-music-sticker">
                    <div className="story-creator-page__sticker-vinyl-container">
                      <img 
                        src={selectedTrack.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100"} 
                        alt="Spinning Cover" 
                        className={`story-creator-page__sticker-vinyl ${previewTrackId === (selectedTrack.id || selectedTrack.title) || isTrimPlayerPlaying ? "story-creator-page__sticker-vinyl--spinning" : ""}`}
                      />
                      <span className="story-creator-page__sticker-notes">🎵</span>
                    </div>
                    <div className="story-creator-page__sticker-info">
                      <span className="story-creator-page__sticker-title">{selectedTrack.title}</span>
                      <span className="story-creator-page__sticker-artist">{selectedTrack.artist}</span>
                    </div>
                  </div>
                )}

                {/* Live Caption overlay block */}
                {caption && (
                  <div className="story-creator-page__preview-caption">
                    {caption}
                  </div>
                )}
              </>
            ) : (
              <div className="story-creator-page__empty-preview">
                <div className="story-creator-page__empty-preview-icon">🎨</div>
                <h3 className="story-creator-page__empty-preview-title">Story Live Mockup</h3>
                <p className="story-creator-page__empty-preview-desc">
                  Select a photo in the creative controls panel to render your story live editing mockup.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
