import { useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import { login } from "../api/auth.api";
import { getErrorMessage } from "../api/http";
import { useAuth } from "../contexts/AuthContext";
import { showToast } from "../components/Toast";
import "../styles/Login.css";

export default function LoginPage() {
    const nav = useNavigate();
    const { login: setAuth } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!email || !password) {
            showToast("Please fill in all fields", "warning");
            return;
        }

        setLoading(true);
        try {
            const res = await login({ email, password });
            localStorage.setItem("refresh_token", res.data.refresh_token);
            await setAuth(res.data.access_token);
            showToast("Welcome back!", "success");
            nav("/posts");
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
                    <h1 className="login__title">Welcome back</h1>
                    <p className="login__subtitle">Sign in to your account to continue</p>
                </div>

                <form onSubmit={onSubmit} className="login__form">
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
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
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

                    <button
                        type="submit"
                        className="btn btn--primary btn--lg"
                        disabled={loading}
                        style={{ width: "100%" }}
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                    <div className="login__footer">
                        <p className="login__footer-text">
                            Don't have an account?{" "}
                            <Link to="/signup" className="login__footer-link">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
