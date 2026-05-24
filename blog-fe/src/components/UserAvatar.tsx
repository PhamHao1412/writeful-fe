import { useState, useEffect, useRef } from "react";
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
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
            border: `${size >= 40 ? 3 : 2}px solid var(--body-bg, #0b0b0b)`,
          }}
        />

        {/* Floating context menu for story avatar click */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="user-avatar-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="user-avatar-menu__item"
              onClick={() => {
                setIsMenuOpen(false);
                nav(`/stories?userId=${userId}`);
              }}
            >
              📖 View Story
            </button>
            <button
              className="user-avatar-menu__item"
              onClick={() => {
                setIsMenuOpen(false);
                if (username) nav(`/users/${username}`);
              }}
            >
              👤 View Profile
            </button>
            <div className="user-avatar-menu__divider" />
            <button
              className="user-avatar-menu__item user-avatar-menu__item--cancel"
              onClick={() => setIsMenuOpen(false)}
            >
              Cancel
            </button>
          </div>
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
