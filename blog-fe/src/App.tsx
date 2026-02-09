// App.tsx (fixed)
import { Navigate, Route, Routes, useLocation, matchPath } from "react-router-dom";
import { Layout } from "./components/Layout";
import LoginPage from "./pages/Login";
import PostListPage from "./pages/PostList";
import PostDetailPage from "./pages/PostDetail";
import PostEditorPage from "./pages/PostEditor";
import { AuthGuard } from "./components/AuthGuard";
import SignUpPage from "./pages/SignUp";
import ProfilePage from "./pages/Profile";
import EditProfilePage from "./pages/EditProfile";
import UserProfilePage from "./pages/UserProfile";
import Activity from "./pages/Activity.tsx";
import Chat from "./pages/Chat";

export default function App() {
    const location = useLocation();

    // Check if current route is an editor page
    const isEditor = matchPath("/posts/new", location.pathname) ||
        matchPath("/posts/:id/edit", location.pathname);

    const routes = (
        <Routes>
            <Route path="/" element={<Navigate to="/posts" replace />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/posts" element={<AuthGuard><PostListPage /></AuthGuard>} />
            <Route path="/posts/new" element={<AuthGuard><PostEditorPage /></AuthGuard>} />
            <Route path="/posts/:id" element={<AuthGuard><PostDetailPage /></AuthGuard>} />
            <Route path="/posts/:id/edit" element={<AuthGuard><PostEditorPage /></AuthGuard>} />

            <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
            <Route path="/profile/edit" element={<AuthGuard><EditProfilePage /></AuthGuard>} />
            <Route path="/users/:username" element={<AuthGuard><UserProfilePage /></AuthGuard>} />

            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/activity" element={<AuthGuard><Activity /></AuthGuard>} />
            <Route path="/chat" element={<AuthGuard><Chat /></AuthGuard>} />

            <Route path="*" element={<div>Not found</div>} />
        </Routes>
    );

if (isEditor) {
        return routes;
    }

    return (
        <Layout>
            {routes}
        </Layout>
    );
}
