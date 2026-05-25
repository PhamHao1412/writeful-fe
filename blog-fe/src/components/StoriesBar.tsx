// src/components/StoriesBar.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useStories } from "../contexts/StoriesContext";
import "../styles/Stories.css";

export function StoriesBar() {
  const { profile } = useAuth();
  const { groups, refreshStories } = useStories();
  const nav = useNavigate();

  useEffect(() => {
    refreshStories();
  }, []);

  // Find if current user has any active story
  const myGroup = groups.find(g => g.user_id === profile?.id);
  const otherGroups = groups.filter(g => g.user_id !== profile?.id);

  return (
    <div className="stories-bar">
      {/* Self Story Creator Card (Facebook-Style First Card) */}
      <div 
        className="story-card story-card--creator" 
        onClick={() => nav("/stories/create")}
      >
        <div className="story-card__creator-cover-wrap">
          <img
            src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
            alt="Your avatar cover"
            className="story-card__creator-cover"
          />
        </div>
        <div className="story-card__creator-footer">
          <div className="story-card__creator-add-badge">
            <span className="story-card__add-plus-icon">+</span>
          </div>
          <span className="story-card__creator-text">Create Story</span>
        </div>
      </div>

      {/* Self Active Story Card (Only shown if current user has active stories) */}
      {myGroup && myGroup.stories && myGroup.stories.length > 0 && (
        <div
          className="story-card"
          onClick={() => nav(`/stories?userId=${profile?.id}`)}
        >
          {/* Story slide preview background */}
          <img
            src={myGroup.stories[0].media_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150"}
            alt="Your Story Preview"
            className="story-card__bg-preview"
          />
          
          {/* Dark overlay for text readability */}
          <div className="story-card__overlay" />

          {/* Small circular avatar in the top-left */}
          <div className={`story-card__avatar-badge ${myGroup.has_unread ? "story-card__avatar-badge--unread" : "story-card__avatar-badge--read"}`}>
            <img
              src={myGroup.avatar_url || profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
              alt="Your Story"
              className="story-card__avatar-img"
            />
          </div>

          {/* Username at the bottom */}
          <span className="story-card__username-text">Your Story</span>
        </div>
      )}

      {/* Other Users' Preview Cards (Facebook-Style Cards) */}
      {otherGroups.map((group) => {
        // Display the first slide's media_url as card preview background
        const previewImage = group.stories?.[0]?.media_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150";
        return (
          <div
            key={group.user_id}
            className="story-card"
            onClick={() => nav(`/stories?userId=${group.user_id}`)}
          >
            {/* Story slide preview background */}
            <img
              src={previewImage}
              alt="Story Preview"
              className="story-card__bg-preview"
            />
            
            {/* Dark overlay for text readability */}
            <div className="story-card__overlay" />

            {/* Small circular avatar in the top-left */}
            <div className={`story-card__avatar-badge ${group.has_unread ? "story-card__avatar-badge--unread" : "story-card__avatar-badge--read"}`}>
              <img
                src={group.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                alt={group.username}
                className="story-card__avatar-img"
              />
            </div>

            {/* Username at the bottom */}
            <span className="story-card__username-text">{group.username}</span>
          </div>
        );
      })}
    </div>
  );
}
