import React, { createContext, useContext } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
    const { isSignedIn, signOut: clerkSignOut } = useClerkAuth();
    const clerk = useClerk();

    const user: User | null = clerkUser ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || clerkUser.firstName || '',
        avatar: clerkUser.imageUrl,
        provider: 'email', // Simplified for now
    } : null;

    const isLoading = !isUserLoaded;

    // Deprecated/Placeholder methods to maintain interface compatibility
    const signIn = async () => {
        clerk.openSignIn();
    };

    const signUp = async () => {
        clerk.openSignUp();
    };

    const signInWithGoogle = async () => {
        clerk.openSignIn();
    };

    const signInWithGitHub = async () => {
        clerk.openSignIn();
    };

    const handleGitHubCallback = async () => {
        // Handled by Clerk
    };

    const signOut = () => {
        clerkSignOut();
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!isSignedIn,
            isLoading,
            signIn,
            signUp,
            signInWithGoogle,
            signInWithGitHub,
            handleGitHubCallback,
            signOut
        }}>
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
