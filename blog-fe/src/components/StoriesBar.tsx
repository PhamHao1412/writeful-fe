// src/components/StoriesBar.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { storyApi, type UserStoriesGroup } from "../api/story.api";
import { StoryCreatorModal } from "./StoryCreatorModal";
import { StoryViewerModal } from "./StoryViewerModal";
import "../styles/Stories.css";

export function StoriesBar() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<UserStoriesGroup[]>([]);
  
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);

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

  const handlePublishSuccess = () => {
    setIsCreatorOpen(false);
    fetchStories();
  };

  const handleViewerClose = () => {
    setSelectedGroupIndex(null);
    fetchStories(); // Refresh read states
  };

  // Find if current user has any active story
  const myGroup = groups.find(g => g.user_id === profile?.id);
  const otherGroups = groups.filter(g => g.user_id !== profile?.id);

  return (
    <div className="stories-bar">
      {/* Self Story Trigger */}
      <div className="story-item" onClick={() => {
        if (myGroup) {
          // If already has active stories, open viewer, otherwise open creator
          const myIdx = groups.findIndex(g => g.user_id === profile?.id);
          setSelectedGroupIndex(myIdx);
        } else {
          setIsCreatorOpen(true);
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
        const globalIdx = groups.findIndex(g => g.user_id === group.user_id);
        return (
          <div
            key={group.user_id}
            className="story-item"
            onClick={() => setSelectedGroupIndex(globalIdx)}
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

      {/* Creator Modal */}
      {isCreatorOpen && (
        <StoryCreatorModal
          onClose={() => setIsCreatorOpen(false)}
          onSuccess={handlePublishSuccess}
        />
      )}

      {/* Viewer Modal */}
      {selectedGroupIndex !== null && (
        <StoryViewerModal
          groups={groups}
          initialGroupIndex={selectedGroupIndex}
          onClose={handleViewerClose}
        />
      )}
    </div>
  );
}
