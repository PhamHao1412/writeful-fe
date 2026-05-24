import React, { createContext, useContext, useState, useEffect } from "react";
import { storyApi, type UserStoriesGroup } from "../api/story.api";
import { useAuth } from "./AuthContext";

interface StoriesContextType {
  groups: UserStoriesGroup[];
  loading: boolean;
  refreshStories: () => Promise<void>;
  getUserStoryGroup: (userId: string) => UserStoriesGroup | undefined;
  markStoryAsSeenLocally: (storyId: string) => void;
  deleteStoryLocally: (storyId: string) => void;
}

const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

export function StoriesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, profile } = useAuth();
  const [groups, setGroups] = useState<UserStoriesGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshStories = async () => {
    if (!isAuthenticated) {
      setGroups([]);
      return;
    }
    setLoading(true);
    try {
      const res = await storyApi.getStories();
      if (res.data?.data) {
        setGroups(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load global stories in context:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStories();
    // Poll every 45 seconds to keep read/unread story statuses synchronized
    const interval = setInterval(refreshStories, 45000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const markStoryAsSeenLocally = (storyId: string) => {
    setGroups((prevGroups) =>
      prevGroups.map((g) => {
        const hasStory = g.stories.some((s) => s.id === storyId);
        if (!hasStory) return g;

        const updatedStories = g.stories.map((s) => {
          if (s.id === storyId) {
            return { ...s, seen: true };
          }
          return s;
        });

        const isSelf = profile && g.user_id === profile.id;
        const hasUnread = isSelf ? false : updatedStories.some((s) => !s.seen);

        return {
          ...g,
          stories: updatedStories,
          has_unread: hasUnread,
        };
      })
    );
  };

  const deleteStoryLocally = (storyId: string) => {
    setGroups((prevGroups) =>
      prevGroups
        .map((g) => {
          const updatedStories = g.stories.filter((s) => s.id !== storyId);
          const isSelf = profile && g.user_id === profile.id;
          const hasUnread = isSelf ? false : updatedStories.some((s) => !s.seen);

          return {
            ...g,
            stories: updatedStories,
            has_unread: hasUnread,
          };
        })
        .filter((g) => g.stories.length > 0)
    );
  };

  const getUserStoryGroup = (userId: string) => {
    return groups.find((g) => g.user_id === userId);
  };

  return (
    <StoriesContext.Provider value={{ groups, loading, refreshStories, getUserStoryGroup, markStoryAsSeenLocally, deleteStoryLocally }}>
      {children}
    </StoriesContext.Provider>
  );
}

export function useStories() {
  const context = useContext(StoriesContext);
  if (!context) {
    throw new Error("useStories must be used within a StoriesProvider");
  }
  return context;
}
