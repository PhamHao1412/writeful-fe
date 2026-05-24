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
      // Navigate to dedicated Stories page and highlight user
      nav(`/stories?userId=${userId}`);
    } else if (username) {
      e.stopPropagation();
      // Otherwise navigate to their profile page
      nav(`/users/${username}`);
    }
  };

  // Spacing rings and sizes calculations
  const ringPadding = size >= 60 ? 3.5 : size >= 40 ? 2.5 : 1.5;
  const ringSize = size + (hasStory ? ringPadding * 2 + 4 : 0);

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
        }}
        onClick={handleClick}
        title={isUnread ? "Xem tin mới" : "Xem tin"}
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
