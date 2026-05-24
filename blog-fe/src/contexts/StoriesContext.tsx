import React, { createContext, useContext, useState, useEffect } from "react";
import { storyApi, type UserStoriesGroup } from "../api/story.api";
import { useAuth } from "./AuthContext";

interface StoriesContextType {
  groups: UserStoriesGroup[];
  loading: boolean;
  refreshStories: () => Promise<void>;
  getUserStoryGroup: (userId: string) => UserStoriesGroup | undefined;
}

const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

export function StoriesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
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

  const getUserStoryGroup = (userId: string) => {
    return groups.find((g) => g.user_id === userId);
  };

  return (
    <StoriesContext.Provider value={{ groups, loading, refreshStories, getUserStoryGroup }}>
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
