import { contentHttp } from './http';

export interface MusicTrack {
  id?: string;
  title: string;
  artist: string;
  url: string;
  cover_url?: string;
  genre: string;
  uploaded_by?: string;
}

export interface StoryDisplayDTO {
  id: string;
  user_id: string;
  type: string;
  media_url: string;
  caption?: string;
  audio_url?: string;
  audio_title?: string;
  audio_artist?: string;
  created_at: string;
  expires_at: string;
  seen: boolean;
}

export interface UserStoriesGroup {
  user_id: string;
  username: string;
  avatar_url: string;
  has_unread: boolean;
  stories: StoryDisplayDTO[];
}

export const storyApi = {
  // Fetch active stories grouped by user
  getStories: () => {
    return contentHttp.get<{ data: UserStoriesGroup[] }>('/content/api/v1/stories');
  },

  // Create a new story slide
  createStory: (data: {
    media_url: string;
    caption?: string;
    audio_url?: string;
    audio_title?: string;
    audio_artist?: string;
  }) => {
    return contentHttp.post('/content/api/v1/stories', data);
  },

  // Mark story as read
  markAsSeen: (storyId: string) => {
    return contentHttp.post(`/content/api/v1/stories/${storyId}/seen`);
  },

  // Fetch shared server music catalog
  getMusics: (genre?: string, search?: string) => {
    return contentHttp.get<{ data: MusicTrack[] }>('/content/api/v1/musics', {
      params: { genre, search }
    });
  },

  // Add a newly uploaded MP3 file record to the shared server catalog
  addMusic: (data: {
    title: string;
    artist: string;
    url: string;
    cover_url?: string;
    genre: string;
  }) => {
    return contentHttp.post('/content/api/v1/musics', data);
  },

  // Upload an audio/MP3 file via media-service
  uploadAudio: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return contentHttp.post<{ data: { url: string } }>('/media/api/v1/video/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};
