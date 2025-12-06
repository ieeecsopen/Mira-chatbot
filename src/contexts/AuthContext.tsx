import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    provider: 'email' | 'google' | 'github';
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signInWithGoogle: (idToken: string) => Promise<void>;
    signInWithGitHub: () => Promise<void>;
    handleGitHubCallback: (code: string) => Promise<void>;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL - adjust based on environment
const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5173/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('mira_auth_token');
            if (token) {
                try {
                    // Verify token with backend
                    const response = await axios.post(
                        `${API_BASE_URL}/auth?action=verify`,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    
                    if (response.data.success && response.data.user) {
                        setUser(response.data.user);
                    } else {
                        // Invalid token, clear storage
                        localStorage.removeItem('mira_auth_token');
                    }
                } catch (error) {
                    console.error('Failed to verify token:', error);
                    localStorage.removeItem('mira_auth_token');
                }
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    const signIn = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth?action=signin`, {
                email,
                password,
            });

            if (response.data.success) {
                const { token, user: userData } = response.data;
                localStorage.setItem('mira_auth_token', token);
                setUser(userData);
            } else {
                throw new Error(response.data.error || 'Sign in failed');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.code === 'ERR_NETWORK' || error.response?.status === 500) {
                    throw new Error('Authentication server is not available. Please ensure the backend is running or deploy to production.');
                }
                if (error.response?.data?.error) {
                    throw new Error(error.response.data.error);
                }
            }
            throw new Error('Sign in failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async (email: string, password: string, name: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth?action=signup`, {
                email,
                password,
                name,
            });

            if (response.data.success) {
                const { token, user: userData } = response.data;
                localStorage.setItem('mira_auth_token', token);
                setUser(userData);
            } else {
                throw new Error(response.data.error || 'Sign up failed');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.code === 'ERR_NETWORK' || error.response?.status === 500) {
                    throw new Error('Authentication server is not available. Please ensure the backend is running or deploy to production.');
                }
                if (error.response?.data?.error) {
                    throw new Error(error.response.data.error);
                }
            }
            throw new Error('Sign up failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const signInWithGoogle = async (idToken: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth?action=google`, {
                idToken,
            });

            if (response.data.success) {
                const { token, user: userData } = response.data;
                localStorage.setItem('mira_auth_token', token);
                setUser(userData);
            } else {
                throw new Error(response.data.error || 'Google sign in failed');
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 500) {
                    throw new Error('Google authentication is only available in production. Please deploy to Vercel or use email/password for local testing.');
                }
                if (error.response?.data?.error) {
                    throw new Error(error.response.data.error);
                }
            }
            throw new Error('Google sign in failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const signInWithGitHub = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/auth?action=github`);
            if (response.data.authUrl) {
                // Redirect to GitHub OAuth
                window.location.href = response.data.authUrl;
            } else {
                throw new Error('Failed to get GitHub auth URL');
            }
        } catch (error) {
            console.error('GitHub auth error:', error);
            if (axios.isAxiosError(error) && error.response?.status === 500) {
                throw new Error('GitHub authentication is only available in production. Please deploy to Vercel or use email/password for local testing.');
            }
            throw new Error('Failed to initiate GitHub sign in');
        }
    };

    const handleGitHubCallback = async (code: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth?action=github-callback`, {
                code,
            });

            if (response.data.success) {
                const { token, user: userData } = response.data;
                localStorage.setItem('mira_auth_token', token);
                setUser(userData);
            } else {
                throw new Error(response.data.error || 'GitHub sign in failed');
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data?.error) {
                throw new Error(error.response.data.error);
            }
            throw new Error('GitHub sign in failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = () => {
        setUser(null);
        localStorage.removeItem('mira_auth_token');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                signIn,
                signUp,
                signInWithGoogle,
                signInWithGitHub,
                handleGitHubCallback,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
