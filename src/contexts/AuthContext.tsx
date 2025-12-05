import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('mira_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored user:', error);
                localStorage.removeItem('mira_user');
            }
        }
        setIsLoading(false);
    }, []);

    const signIn = async (email: string, _password: string) => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // In a real app, you'd validate credentials with your backend
            // For demo purposes, we'll accept any email/password
            const newUser: User = {
                id: Date.now().toString(),
                email,
                name: email.split('@')[0],
            };

            setUser(newUser);
            localStorage.setItem('mira_user', JSON.stringify(newUser));
        } catch (error) {
            throw new Error('Sign in failed');
        } finally {
            setIsLoading(false);
        }
    };

    const signUp = async (email: string, _password: string, name: string) => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // In a real app, you'd create a new user account
            const newUser: User = {
                id: Date.now().toString(),
                email,
                name,
            };

            setUser(newUser);
            localStorage.setItem('mira_user', JSON.stringify(newUser));
        } catch (error) {
            throw new Error('Sign up failed');
        } finally {
            setIsLoading(false);
        }
    };

    const signOut = () => {
        setUser(null);
        localStorage.removeItem('mira_user');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                signIn,
                signUp,
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
