import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../api/auth.api";
import { getErrorMessage } from "../api/http";
import { showToast } from "../components/Toast";
import "../styles/SignUp.css";

export default function SignUpPage() {
    const nav = useNavigate();
    const [displayName, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!displayName || !username || !email || !password || !confirmPassword) {
            showToast("Please fill in all fields", "warning");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Passwords do not match", "error");
            return;
        }

        if (password.length < 6) {
            showToast("Password must be at least 6 characters", "warning");
            return;
        }

        setLoading(true);
        try {
            await signUp({ display_name: displayName, username, email, password });
            showToast("Account created successfully! Please sign in.", "success");
            nav("/login");
        } catch (e: any) {
            showToast(getErrorMessage(e), "error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login">
            <div className="login__card">
                <div className="login__header">
                    <div className="login__logo">✍️</div>
                    <h1 className="login__title">Create your account</h1>
                    <p className="login__subtitle">Join us and start sharing your stories</p>
                </div>

                <form onSubmit={onSubmit} className="login__form">
                    <div className="form-group">
                        <label htmlFor="name" className="form-label">Name</label>
                        <input
                            id="name"
                            type="text"
                            className="form-input"
                            placeholder="Your full name"
                            value={displayName}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="username" className="form-label">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="form-input"
                            placeholder="Choose a username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <div className="form-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="form-input"
                                placeholder="Create a password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="new-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="form-input-icon"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? "👁️" : "👁️‍🗨️"}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                        <div className="form-input-wrapper">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                className="form-input"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="form-input-icon"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn--primary btn--lg"
                        disabled={loading}
                        style={{ width: "100%" }}
                    >
                        {loading ? "Creating account..." : "Sign up"}
                    </button>

                    <div className="login__footer">
                        <p className="login__footer-text">
                            Already have an account?{" "}
                            <Link to="/login" className="login__footer-link">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
