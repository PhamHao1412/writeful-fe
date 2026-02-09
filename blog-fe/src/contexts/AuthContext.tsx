import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { getProfile, type UserProfile } from "../api/auth.api";

interface AuthContextValue {
    isAuthenticated: boolean;
    profile: UserProfile | null;
    profileLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return !!localStorage.getItem("access_token");
    });
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const isFetchingRef = useRef(false);
    const profileFetchedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        async function loadProfile() {
            if (!isAuthenticated || profile || profileFetchedRef.current || cancelled) {
                return;
            }

            if (isFetchingRef.current) return;

            isFetchingRef.current = true;
            setProfileLoading(true);

            try {
                const data = await getProfile();
                if (!cancelled) {
                    setProfile(data);
                    profileFetchedRef.current = true;
                }
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to fetch profile:", error);
                if ((error as any)?.response?.status === 401) {
                    setIsAuthenticated(false);
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                }
            } finally {
                if (!cancelled) {
                    setProfileLoading(false);
                }
                isFetchingRef.current = false;
            }
        }

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, profile]);

    const login = async (token: string) => {
        localStorage.setItem("access_token", token);
        setIsAuthenticated(true);
        profileFetchedRef.current = false;
        isFetchingRef.current = false;

        // Fetch profile immediately after login
        try {
            const data = await getProfile();
            setProfile(data);
            profileFetchedRef.current = true;
        } catch (error) {
            console.error("Failed to fetch profile after login:", error);
        }
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setIsAuthenticated(false);
        setProfile(null);
        profileFetchedRef.current = false;
        isFetchingRef.current = false;
    };

    const refreshProfile = async () => {
        profileFetchedRef.current = false;
        isFetchingRef.current = false;

        try {
            const data = await getProfile();
            setProfile(data);
            profileFetchedRef.current = true;
        } catch (error) {
            console.error("Failed to refresh profile:", error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                profile,
                profileLoading,
                login,
                logout,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
