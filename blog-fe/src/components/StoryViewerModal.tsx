// src/components/StoryViewerModal.tsx
import { useEffect, useState, useRef } from "react";
import { storyApi, type UserStoriesGroup } from "../api/story.api";
import { createConversation, sendMessage } from "../api/chat.api";
import { showToast } from "./Toast";
import "../styles/Stories.css";

interface StoryViewerModalProps {
  groups: UserStoriesGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

export function StoryViewerModal({ groups, initialGroupIndex, onClose }: StoryViewerModalProps) {
  const [currentGroupIdx, setCurrentGroupIdx] = useState(initialGroupIndex);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  
  const currentGroup = groups[currentGroupIdx];
  const currentSlide = currentGroup?.stories[currentSlideIdx];

  // Audio Playback settings
  const [isMuted, setIsMuted] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Time progress bar settings (15 seconds display duration)
  const duration = 15000; // 15 seconds
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);

  // Quick Reply text input
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Mark story as read when it displays
  const markAsRead = async (storyId: string) => {
    try {
      await storyApi.markAsSeen(storyId);
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

  // Destroy audio on close
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
      setCurrentGroupIdx(prev => prev - 1);
      setCurrentSlideIdx(prevGroup.stories.length - 1);
    } else {
      // Loop back to beginning of current slide
      resetProgress();
    }
  };

  const handleNextSlide = () => {
    if (currentSlideIdx < currentGroup.stories.length - 1) {
      setCurrentSlideIdx(prev => prev + 1);
    } else if (currentGroupIdx < groups.length - 1) {
      // Go to next user's first story
      setCurrentGroupIdx(prev => prev + 1);
      setCurrentSlideIdx(0);
    } else {
      // Reached the absolute end of all stories, auto close
      onClose();
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
      const formattedContent = `${reactContent} \n\n[Phản hồi tin của bạn: ${currentSlide.media_url}]`;

      // 3. Send message
      await sendMessage({
        conversation_id: room.id,
        type: "text",
        content: formattedContent
      });

      showToast("Sent story reply to author's Chat!", "success");
      setReplyText("");
    } catch (err) {
      console.error(err);
      showToast("Failed to send reply to chat.", "error");
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

  if (!currentGroup || !currentSlide) return null;

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div className="story-viewer" onClick={e => e.stopPropagation()}>
        {/* Custom Progress Indicators */}
        <div className="story-viewer__progress-container">
          {currentGroup.stories.map((st, idx) => {
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

        {/* Story Viewer Header */}
        <header className="story-viewer__header">
          <div className="story-viewer__user">
            <img
              src={currentGroup.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
              alt={currentGroup.username}
              className="story-viewer__avatar"
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="story-viewer__username">{currentGroup.username}</span>
              <span className="story-viewer__time">
                {new Date(currentSlide.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          
          <div className="story-viewer__controls">
            {currentSlide.audio_url && (
              <button
                className="story-viewer__btn"
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
            )}
            <button className="story-viewer__btn" onClick={onClose}>&times;</button>
          </div>
        </header>

        {/* Story Viewer Body (Click triggers mousedown/hold pausing) */}
        <div
          className="story-viewer__body"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Nav overlay buttons */}
          <div className="story-viewer__nav-trigger story-viewer__nav-trigger--prev" onClick={(e) => {
            e.stopPropagation();
            handlePrevSlide();
          }} />
          <div className="story-viewer__nav-trigger story-viewer__nav-trigger--next" onClick={(e) => {
            e.stopPropagation();
            handleNextSlide();
          }} />

          <img
            src={currentSlide.media_url}
            alt="Story background"
            className="story-viewer__img"
            draggable={false}
          />

          {/* Floating stickers and caption */}
          <div className="story-viewer__meta">
            {/* Spinning Vinyl Sticker */}
            {currentSlide.audio_url && (
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

            {currentSlide.caption && (
              <p className="story-viewer__caption">{currentSlide.caption}</p>
            )}
          </div>
        </div>

        {/* Footer Quick replies & emoji reactions */}
        <footer className="story-viewer__footer" onClick={e => e.stopPropagation()}>
          <div className="story-viewer__reactions">
            {["❤️", "😂", "😮", "😢", "👏", "🔥"].map((emoji) => (
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
              placeholder={`Trả lời ${currentGroup.username}...`}
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
                Gửi
              </button>
            )}
          </form>
        </footer>
      </div>
    </div>
  );
}
