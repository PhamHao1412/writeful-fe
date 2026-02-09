import { useEffect, useState } from "react";
import { getProfile, type UserProfile } from "../api/auth.api";
import { getErrorMessage } from "../api/http";
import "../styles/Activity.css";

export default function ActivityPage() {
    const [, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setErr(null);
            setLoading(true);
            try {
                const data = await getProfile();
                setProfile(data);
            } catch (e: any) {
                setErr(getErrorMessage(e));
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="aactivity__loading">Loading...</div>;
    if (err) return <div className="activity__error">{err}</div>;

    return (
        <div className="activity">
            <h1 className="activity__title">Activity</h1>
            <div className="activity__tabs">
                <button className="activity__tab activity__tab--active">All</button>
                <button className="activity__tab">Replies</button>
                <button className="activity__tab">Restacks</button>
            </div>
            <div className="activity__content">
                <div className="activity__empty">
                    You don't have any activity yet. Likes, replies, and other activity will appear here.
                </div>
            </div>
        </div>
    );
}
