import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useStories } from "../contexts/StoriesContext";
import "../styles/UserAvatar.css";

interface UserAvatarProps {
  userId?: string;
  avatarUrl?: string;
  displayName?: string;
  username?: string;
  size?: number; // size in px
  onClickOverride?: (e: React.MouseEvent) => void;
  className?: string;
}

export function UserAvatar({
  userId,
  avatarUrl,
  displayName,
  username,
  size = 40,
  onClickOverride,
  className = "",
}: UserAvatarProps) {
  const nav = useNavigate();
  const { getUserStoryGroup } = useStories();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context dropdown on outside click, scroll, or window resize
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      setIsMenuOpen(false);
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("scroll", handleScrollOrResize, { passive: true });
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isMenuOpen]);

  const storyGroup = userId ? getUserStoryGroup(userId) : undefined;
  const hasStory = !!storyGroup && storyGroup.stories.length > 0;
  const isUnread = storyGroup?.has_unread;

  const handleClick = (e: React.MouseEvent) => {
    if (onClickOverride) {
      onClickOverride(e);
      return;
    }

    if (hasStory && userId) {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 154;
      let leftPos = rect.left + rect.width / 2 - menuWidth / 2;

      // Clamp leftPos to avoid overflowing viewport edges (min 12px margin)
      const maxLeft = window.innerWidth - menuWidth - 12;
      leftPos = Math.max(12, Math.min(maxLeft, leftPos));

      setMenuCoords({
        top: rect.bottom,
        left: leftPos,
      });
      setIsMenuOpen(true); // Open the options dropdown
    } else if (username) {
      e.stopPropagation();
      nav(`/users/${username}`);
    }
  };

  // Border spacing calculations - Thicker gradient border spacing
  const ringPadding = size >= 60 ? 4.5 : size >= 40 ? 3.5 : 2.5;
  const ringSpacer = size >= 40 ? 4 : 3; // buffer gap space
  const ringSize = size + (hasStory ? ringPadding * 2 + ringSpacer : 0);

  const imageSrc = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || username || "U")}&background=random`;

  if (hasStory) {
    return (
      <div
        className={`user-avatar-wrapper ${isUnread ? "user-avatar-wrapper--unread" : "user-avatar-wrapper--read"} ${className}`}
        style={{
          width: `${ringSize}px`,
          height: `${ringSize}px`,
          padding: `${ringPadding}px`,
          cursor: "pointer",
          position: "relative",
        }}
        onClick={handleClick}
        title={isUnread ? "New story active" : "View stories"}
      >
        <img
          src={imageSrc}
          alt={displayName || username || "User"}
          className="user-avatar-img user-avatar-img--has-story"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            border: `${size >= 40 ? 3 : 2}px solid var(--avatar-spacer-color, #fff)`,
          }}
        />

        {/* Floating context menu for story avatar click using React Portal */}
        {isMenuOpen && menuCoords && createPortal(
          <div
            ref={menuRef}
            className="user-avatar-menu"
            style={{
              top: `${menuCoords.top + 8}px`,
              left: `${menuCoords.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="user-avatar-menu__item"
              onClick={() => {
                setIsMenuOpen(false);
                nav(`/stories?userId=${userId}`);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="user-avatar-menu__icon">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              View Story
            </button>
            <button
              className="user-avatar-menu__item"
              onClick={() => {
                setIsMenuOpen(false);
                if (username) nav(`/users/${username}`);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="user-avatar-menu__icon">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              View Profile
            </button>
            <div className="user-avatar-menu__divider" />
            <button
              className="user-avatar-menu__item user-avatar-menu__item--cancel"
              onClick={() => setIsMenuOpen(false)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="user-avatar-menu__icon">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Cancel
            </button>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // Standard avatar if no active story
  return (
    <img
      src={imageSrc}
      alt={displayName || username || "User"}
      className={`user-avatar-img ${username || onClickOverride ? "user-avatar-img--clickable" : ""} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        cursor: username || onClickOverride ? "pointer" : "default",
      }}
      onClick={handleClick}
    />
  );
}
