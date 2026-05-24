// src/components/StoriesBar.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { storyApi, type UserStoriesGroup } from "../api/story.api";
import "../styles/Stories.css";

export function StoriesBar() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [groups, setGroups] = useState<UserStoriesGroup[]>([]);

  const fetchStories = async () => {
    try {
      const res = await storyApi.getStories();
      if (res.data?.data) {
        setGroups(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load stories:", err);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Find if current user has any active story
  const myGroup = groups.find(g => g.user_id === profile?.id);
  const otherGroups = groups.filter(g => g.user_id !== profile?.id);

  return (
    <div className="stories-bar">
      {/* Self Story Trigger */}
      <div className="story-item" onClick={() => {
        if (myGroup) {
          // Navigate to dedicated Stories page and highlight self
          nav(`/stories?userId=${profile?.id}`);
        } else {
          nav("/stories/create");
        }
      }}>
        <div className="story-item__avatar-container story-item__avatar-container--self">
          <img
            src={profile?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
            alt="Your story"
            className="story-item__avatar"
          />
          {!myGroup && <div className="story-item__add-btn">+</div>}
        </div>
        <span className="story-item__username">Your Story</span>
      </div>

      {/* Other Users' Stories */}
      {otherGroups.map((group) => {
        return (
          <div
            key={group.user_id}
            className="story-item"
            onClick={() => nav(`/stories?userId=${group.user_id}`)}
          >
            <div className={`story-item__avatar-container ${group.has_unread ? "story-item__avatar-container--unread" : "story-item__avatar-container--read"}`}>
              <img
                src={group.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"}
                alt={group.username}
                className="story-item__avatar"
              />
            </div>
            <span className="story-item__username">{group.username}</span>
          </div>
        );
      })}
    </div>
  );
}
