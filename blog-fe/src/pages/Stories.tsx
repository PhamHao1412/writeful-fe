// src/pages/Stories.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStories } from "../contexts/StoriesContext";
import { storyApi, type UserStoriesGroup } from "../api/story.api";
import { createConversation, sendMessage } from "../api/chat.api";
import { showToast } from "../components/Toast";
import "../styles/Stories.css";

export default function StoriesPage() {
  const { profile } = useAuth();
  const { refreshStories } = useStories();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [groups, setGroups] = useState<UserStoriesGroup[]>([]);
  const [currentGroupIdx, setCurrentGroupIdx] = useState<number>(0);
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);

  const currentGroup = groups[currentGroupIdx];
  const currentSlide = currentGroup?.stories?.[currentSlideIdx];

  // Audio Playback settings
  const [isMuted, setIsMuted] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Time progress bar settings (10 seconds display duration)
  const duration = 10000; // 10 seconds
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);

  // Quick Reply text input
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Load all stories from API
  const fetchStories = async () => {
    try {
      const res = await storyApi.getStories();
      if (res.data?.data) {
        const fetchedGroups = res.data.data;
        setGroups(fetchedGroups);

        // Determine which story group to highlight based on URL query param
        const userIdParam = searchParams.get("userId");
        if (userIdParam && fetchedGroups.length > 0) {
          const matchIdx = fetchedGroups.findIndex((g: UserStoriesGroup) => g.user_id === userIdParam);
          if (matchIdx !== -1) {
            setCurrentGroupIdx(matchIdx);
            setCurrentSlideIdx(0);
            return;
          }
        }
        
        // Default to first group if no match or parameter
        if (fetchedGroups.length > 0) {
          setCurrentGroupIdx(0);
          setCurrentSlideIdx(0);
        }
      }
    } catch (err) {
      console.error("Failed to load stories:", err);
      showToast("Failed to load stories.", "error");
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Sync index with query parameters when URL updates
  useEffect(() => {
    const userIdParam = searchParams.get("userId");
    if (userIdParam && groups.length > 0) {
      const matchIdx = groups.findIndex((g) => g.user_id === userIdParam);
      if (matchIdx !== -1 && matchIdx !== currentGroupIdx) {
        setCurrentGroupIdx(matchIdx);
        setCurrentSlideIdx(0);
      }
    }
  }, [searchParams, groups]);

  // Mark story as read when it displays
  const markAsRead = async (storyId: string) => {
    try {
      await storyApi.markAsSeen(storyId);
      
      // Update local state immediately for high responsiveness
      setGroups(prevGroups => {
        return prevGroups.map(g => {
          const updatedStories = g.stories.map(s => {
            if (s.id === storyId) {
              return { ...s, seen: true };
            }
            return s;
          });
          
          return {
            ...g,
            stories: updatedStories,
            has_unread: g.user_id === profile?.id ? false : updatedStories.some(s => !s.seen)
          };
        });
      });

      // Synchronize the global context state so other pages (Home Feed, Chat) get instant read status
      refreshStories();
    } catch (err) {
      console.error("Failed to mark story as seen:", err);
    }
  };

  useEffect(() => {
    if (currentSlide) {
      markAsRead(currentSlide.id);
      resetProgress();
      setupAudio();
    }
  }, [currentGroupIdx, currentSlideIdx]);

  const resetProgress = () => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    setProgress(0);
    elapsedTimeRef.current = 0;
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  // Timer loop for progress bar
  useEffect(() => {
    if (isPaused) {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
      return;
    }

    startTimeRef.current = Date.now() - elapsedTimeRef.current;
    
    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      elapsedTimeRef.current = elapsed;
      
      const percent = Math.min((elapsed / duration) * 100, 100);
      setProgress(percent);

      if (elapsed >= duration) {
        handleNextSlide();
      }
    }, 100);

    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPaused, currentGroupIdx, currentSlideIdx]);

  // Audio elements config
  const setupAudio = () => {
    // Stop old audio player
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    if (currentSlide?.audio_url) {
      const audio = new Audio(currentSlide.audio_url);
      audio.loop = true;
      audio.volume = isMuted ? 0 : 0.4;
      
      const offset = currentSlide.audio_offset || 0;
      
      // Seek to the custom offset
      audio.currentTime = offset;
      
      audio.addEventListener("loadedmetadata", () => {
        audio.currentTime = offset;
      });

      audio.addEventListener("timeupdate", () => {
        if (audio.currentTime >= offset + 10) {
          audio.currentTime = offset;
        }
        if (audio.currentTime < offset) {
          audio.currentTime = offset;
        }
      });
      
      if (!isPaused) {
        audio.play().catch(e => console.log("Autoplay blocked by browser policy until interaction:", e));
      }
      audioPlayerRef.current = audio;
    }
  };

  // Synchronize Mute status
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.volume = isMuted ? 0 : 0.4;
    }
  }, [isMuted]);

  // Sync Pause/Play with slider freeze states
  useEffect(() => {
    if (audioPlayerRef.current) {
      if (isPaused) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play().catch(e => console.log(e));
      }
    }
  }, [isPaused]);

  // Destroy audio on close/unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handlePrevSlide = () => {
    if (currentSlideIdx > 0) {
      setCurrentSlideIdx(prev => prev - 1);
    } else if (currentGroupIdx > 0) {
      // Go to previous user's last story
      const prevGroup = groups[currentGroupIdx - 1];
      const prevIdx = currentGroupIdx - 1;
      setCurrentGroupIdx(prevIdx);
      setCurrentSlideIdx((prevGroup?.stories?.length || 0) - 1);
      setSearchParams({ userId: prevGroup.user_id });
    } else {
      // Loop back to beginning of current slide
      resetProgress();
    }
  };

  const handleCloseAndGoBack = () => {
    // Navigate back in history if possible, otherwise fallback to home
    if (window.history.length > 1) {
      nav(-1);
    } else {
      nav("/posts");
    }
  };

  // Close stories viewer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseAndGoBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [groups, currentGroupIdx]);

  const handleBackgroundClick = () => {
    handleCloseAndGoBack();
  };

  const handleNextSlide = () => {
    if (currentSlideIdx < (currentGroup?.stories?.length || 0) - 1) {
      setCurrentSlideIdx(prev => prev + 1);
    } else {
      // Reached the absolute end of this user's story group, automatically return to previous page
      handleCloseAndGoBack();
    }
  };

  const handleReactionSubmit = async (reactContent: string) => {
    if (!currentSlide) return;
    setSendingReply(true);
    setIsPaused(true); // Pause viewer while replying

    try {
      // 1. Get or Create direct chat room with the story author
      const room = await createConversation({
        type: "direct",
        participant_ids: [currentSlide.user_id]
      });

      if (!room || !room.id) throw new Error("Failed to get room ID");

      // 2. Format custom Story reply message
      const formattedContent = `${reactContent} \n\n[Replied to your story: ${currentSlide.media_url}]`;

      // 3. Send message
      await sendMessage({
        conversation_id: room.id,
        type: "text",
        content: formattedContent
      });

      showToast("Story reply sent to chat!", "success");
      setReplyText("");
    } catch (err) {
      console.error(err);
      showToast("Failed to send reply.", "error");
    } finally {
      setSendingReply(false);
      setIsPaused(false); // Resume story slider
    }
  };

  const handleTextReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    handleReactionSubmit(replyText);
  };

  const handleSelectUserFromSidebar = (idx: number, userId: string) => {
    setCurrentGroupIdx(idx);
    setCurrentSlideIdx(0);
    setSearchParams({ userId });
  };

  // Find if current user has any active story
  const myGroup = groups.find(g => g.user_id === profile?.id);

  return (
    <div className="story-viewer-overlay" style={{ position: "relative", height: "100vh", zIndex: 1 }}>
      {/* Side User List List (Sidebar) */}
      <div className="story-viewer__sidebar">
        <div className="story-viewer__sidebar-header">
          <div className="story-viewer__sidebar-header-top">
            <button className="story-viewer__sidebar-close" onClick={() => nav("/posts")} title="Back">
              &larr;
            </button>
            <span className="story-viewer__sidebar-logo">Writeful Stories</span>
          </div>
          <h2 className="story-viewer__sidebar-title">Stories</h2>
        </div>

        <div className="story-viewer__sidebar-list">
          {/* Create Story Trigger */}
          <div 
            className="story-viewer__sidebar-subtitle" 
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>Your Story</span>
            <button 
              onClick={() => nav("/stories/create")}
              style={{
                background: "rgba(0, 149, 246, 0.2)",
                color: "#0095f6",
                border: "none",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.2s"
              }}
              title="Create story"
            >
              +
            </button>
          </div>

          {myGroup ? (
            <div
              className={`story-viewer__sidebar-item ${groups[currentGroupIdx]?.user_id === profile?.id ? "story-viewer__sidebar-item--active" : ""}`}
              onClick={() => {
                const idx = groups.findIndex(g => g.user_id === profile?.id);
                if (idx !== -1) handleSelectUserFromSidebar(idx, profile?.id || "");
              }}
            >
              <div className="story-viewer__sidebar-avatar-ring story-viewer__sidebar-avatar-ring--read">
                <img
                  src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                  alt="Your story"
                  className="story-viewer__sidebar-avatar"
                />
              </div>
              <div className="story-viewer__sidebar-item-meta">
                <span className="story-viewer__sidebar-username">Your Story</span>
                <span className="story-viewer__sidebar-time">View your active story</span>
              </div>
            </div>
          ) : (
            <div
              className="story-viewer__sidebar-item"
              onClick={() => nav("/stories/create")}
              style={{ opacity: 0.8 }}
            >
              <div className="story-viewer__sidebar-avatar-ring story-viewer__sidebar-avatar-ring--read">
                <img
                  src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                  alt="Your story"
                  className="story-viewer__sidebar-avatar"
                />
              </div>
              <div className="story-viewer__sidebar-item-meta">
                <span className="story-viewer__sidebar-username">Create Story</span>
                <span className="story-viewer__sidebar-time">Share a photo or write caption</span>
              </div>
            </div>
          )}

          <div style={{ margin: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }} />

          <span className="story-viewer__sidebar-subtitle">All Stories</span>
          {groups.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
              No active stories available.
            </div>
          ) : (
            groups.map((group, idx) => {
              const isActiveUser = currentGroupIdx === idx;
              const groupLatestSlide = group.stories?.[group.stories.length - 1];
              
              return (
                <div
                  key={group.user_id}
                  className={`story-viewer__sidebar-item ${isActiveUser ? "story-viewer__sidebar-item--active" : ""}`}
                  onClick={() => handleSelectUserFromSidebar(idx, group.user_id)}
                >
                  <div className={`story-viewer__sidebar-avatar-ring ${group.has_unread ? "story-viewer__sidebar-avatar-ring--unread" : "story-viewer__sidebar-avatar-ring--read"}`}>
                    <img
                      src={group.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                      alt={group.username}
                      className="story-viewer__sidebar-avatar"
                    />
                  </div>
                  <div className="story-viewer__sidebar-item-meta">
                    <span className="story-viewer__sidebar-username">{group.username}</span>
                    {groupLatestSlide && (
                      <span className="story-viewer__sidebar-time">
                        {new Date(groupLatestSlide.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main black viewer screen */}
      <div className="story-viewer__main" onClick={handleBackgroundClick}>
        {groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>📱</div>
            <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px" }}>Empty Library</h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", marginBottom: "24px" }}>Be the first to share an active story today!</p>
            <button className="btn btn--primary" onClick={() => nav("/stories/create")}>
              + Create Story
            </button>
          </div>
        ) : (
          <>
            {/* Floating Chevrons outside the Card wrapper */}
            {currentSlideIdx > 0 && (
              <button
                type="button"
                className="story-viewer__nav-btn story-viewer__nav-btn--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevSlide();
                }}
              >
                &#10094;
              </button>
            )}

            {currentSlideIdx < (currentGroup?.stories?.length || 0) - 1 && (
              <button
                type="button"
                className="story-viewer__nav-btn story-viewer__nav-btn--next"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextSlide();
                }}
              >
                &#10095;
              </button>
            )}

            {/* Aspect Ratio Card wrapper (9:16) */}
            <div className="story-viewer__card-wrapper" onClick={e => e.stopPropagation()}>
              {/* Custom Progress Indicators */}
              <div className="story-viewer__progress-container">
                {currentGroup?.stories?.map((st, idx) => {
                  let widthPercent = 0;
                  if (idx < currentSlideIdx) widthPercent = 100;
                  if (idx === currentSlideIdx) widthPercent = progress;
                  return (
                    <div key={st.id} className="story-viewer__progress-bar">
                      <div
                        className="story-viewer__progress-fill"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Story Viewer Header inside card */}
              <header className="story-viewer__header">
                <div className="story-viewer__user">
                  <img
                    src={currentGroup?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                    alt={currentGroup?.username}
                    className="story-viewer__avatar"
                  />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span className="story-viewer__username">{currentGroup?.username}</span>
                    <span className="story-viewer__time">
                      {currentSlide && new Date(currentSlide.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                
                <div className="story-viewer__controls">
                  {currentSlide?.audio_url && (
                    <button
                      className="story-viewer__btn"
                      onClick={() => setIsMuted(!isMuted)}
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? "🔇" : "🔊"}
                    </button>
                  )}
                  {/* Play/Pause control status indicator */}
                  <button
                    className="story-viewer__btn"
                    onClick={() => setIsPaused(!isPaused)}
                    title={isPaused ? "Play slide" : "Pause slide"}
                  >
                    {isPaused ? "▶️" : "⏸️"}
                  </button>
                </div>
              </header>

              {/* Story Image display */}
              <div
                className="story-viewer__body"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
              >
                {/* Hidden navigation click overlays for Mobile/Tablet */}
                <div className="story-viewer__nav-trigger story-viewer__nav-trigger--prev" onClick={(e) => {
                  e.stopPropagation();
                  handlePrevSlide();
                }} />
                <div className="story-viewer__nav-trigger story-viewer__nav-trigger--next" onClick={(e) => {
                  e.stopPropagation();
                  handleNextSlide();
                }} />

                {currentSlide && (
                  <img
                    src={currentSlide.media_url}
                    alt="Story background"
                    className="story-viewer__img"
                    draggable={false}
                  />
                )}

                {/* Captions and stickers */}
                <div className="story-viewer__meta">
                  {/* Spinning Vinyl Sticker */}
                  {currentSlide?.audio_url && (
                    <div className="music-sticker">
                      <div className="music-sticker__disc-container">
                        <div className={`music-sticker__disc ${!isPaused ? "music-sticker__disc--playing" : ""}`}>
                          <div className="music-sticker__disc-groove">
                            <img
                              src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=50"
                              alt="cover"
                              className="music-sticker__disc-cover"
                            />
                          </div>
                          <div className="music-sticker__disc-pin" />
                        </div>
                      </div>
                      <div className="music-sticker__info">
                        <span className="music-sticker__title">{currentSlide.audio_title || "Unknown Song"}</span>
                        <span className="music-sticker__artist">{currentSlide.audio_artist || "Unknown Artist"}</span>
                      </div>
                    </div>
                  )}

                  {currentSlide?.caption && (
                    <p className="story-viewer__caption">{currentSlide.caption}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Quick replies box positioned perfectly under the story card */}
            <div className="story-viewer__bottom-reply" onClick={e => e.stopPropagation()}>
              <div className="story-viewer__reactions">
                {["👍", "❤️", "😆", "😮", "😢", "😡"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="story-viewer__reaction-btn"
                    onClick={() => handleReactionSubmit(emoji)}
                    disabled={sendingReply}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form className="story-viewer__reply-form" onSubmit={handleTextReplySubmit}>
                <input
                  type="text"
                  placeholder={`Send reply to ${currentGroup?.username}...`}
                  className="story-viewer__reply-input"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={sendingReply}
                />
                {replyText.trim() && (
                  <button
                    type="submit"
                    className="story-viewer__reply-send"
                    disabled={sendingReply}
                  >
                    Send
                  </button>
                )}
              </form>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
