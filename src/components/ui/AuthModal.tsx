import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Sparkles, Loader2, Github } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { signIn, signUp, signInWithGoogle, signInWithGitHub, handleGitHubCallback } = useAuth();

    // Check for GitHub callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            handleGitHubCallback(code)
                .then(() => {
                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    onClose();
                })
                .catch((err) => {
                    setError(err.message);
                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                });
        }
    }, [handleGitHubCallback, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            if (mode === 'signin') {
                await signIn(email, password);
            } else {
                if (!name.trim()) {
                    setError('Please enter your name');
                    setIsSubmitting(false);
                    return;
                }
                await signUp(email, password, name);
            }
            // Close modal on success
            onClose();
            // Reset form
            setEmail('');
            setPassword('');
            setName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            setError('Failed to get Google credentials');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await signInWithGoogle(credentialResponse.credential);
            onClose();
            // Reset form
            setEmail('');
            setPassword('');
            setName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google sign in failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGitHubSignIn = async () => {
        setIsSubmitting(true);
        setError('');

        try {
            await signInWithGitHub();
            // User will be redirected to GitHub
        } catch (err) {
            setError(err instanceof Error ? err.message : 'GitHub sign in failed');
            setIsSubmitting(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'signin' ? 'signup' : 'signin');
        setError('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full max-w-md bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-8">
                            {/* Header */}
                            <div className="relative p-6 border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                            <Sparkles size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">
                                                {mode === 'signin' ? 'Welcome back' : 'Create account'}
                                            </h2>
                                            <p className="text-sm text-gray-500">
                                                {mode === 'signin' ? 'Sign in to continue' : 'Get started with Mira'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* OAuth Buttons */}
                                <div className="space-y-3">
                                    {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                                        <div className="flex justify-center">
                                            <GoogleLogin
                                                onSuccess={handleGoogleSuccess}
                                                onError={() => setError('Google sign in failed')}
                                                theme="filled_black"
                                                size="large"
                                                text={mode === 'signin' ? 'signin_with' : 'signup_with'}
                                                width="350"
                                                useOneTap={false}
                                                context={mode === 'signin' ? 'signin' : 'signup'}
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleGitHubSignIn}
                                        disabled={isSubmitting}
                                        className="w-full py-3 px-4 bg-[#24292e] hover:bg-[#1b1f23] text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-white/10"
                                    >
                                        <Github size={20} />
                                        <span>{mode === 'signin' ? 'Sign in with GitHub' : 'Sign up with GitHub'}</span>
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/10"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] text-gray-500">
                                            Or continue with email
                                        </span>
                                    </div>
                                </div>

                                {mode === 'signup' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Name
                                        </label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="John Doe"
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all"
                                        />
                                    </div>
                                    {mode === 'signup' && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            At least 6 characters
                                        </p>
                                    )}
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
                                        </>
                                    ) : (
                                        <span>{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="p-6 pt-0">
                                <div className="text-center text-sm text-gray-400">
                                    {mode === 'signin' ? (
                                        <>
                                            Don't have an account?{' '}
                                            <button
                                                type="button"
                                                onClick={switchMode}
                                                className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                                            >
                                                Sign up
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            Already have an account?{' '}
                                            <button
                                                type="button"
                                                onClick={switchMode}
                                                className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
                                            >
                                                Sign in
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
