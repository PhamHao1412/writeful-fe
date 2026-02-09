import { useState, useEffect } from 'react';
import { getFollowing } from '../api/auth.api';
import '../styles/FollowingList.css';

interface User {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
}

interface FollowingListProps {
    currentUserId: string;
    onSelectUser: (userId: string) => void;
}

export default function FollowingList({ currentUserId, onSelectUser }: FollowingListProps) {
    const [following, setFollowing] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadFollowing();
    }, [currentUserId]);

    const loadFollowing = async () => {
        try {
            const { data } = await getFollowing(currentUserId);
            setFollowing(data);
        } catch (error) {
            console.error('Error loading following:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="following-list">
                <h3 className="following-list__title">Messages</h3>
                <div className="following-list__loading">Loading...</div>
            </div>
        );
    }

    if (following.length === 0) {
        return (
            <div className="following-list">
                <h3 className="following-list__title">Messages</h3>
                <div className="following-list__empty">
                    <p>Follow users to start chatting</p>
                </div>
            </div>
        );
    }

    return (
        <div className="following-list">
            <h3 className="following-list__title">Messages</h3>
            <div className="following-list__scroll">
                {following.map((user) => (
                    <button
                        key={user.id}
                        className="following-list__user"
                        onClick={() => onSelectUser(user.id)}
                        title={user.display_name}
                    >
                        <div className="following-list__avatar-wrapper">
                            <img
                                src={user.avatar_url || 'https://via.placeholder.com/60'}
                                alt={user.display_name}
                                className="following-list__avatar"
                            />
                        </div>
                        <span className="following-list__name">{user.display_name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
