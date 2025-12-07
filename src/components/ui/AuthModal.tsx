import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50'
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className='fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50'
                    >
                        <div className='relative'>
                            <button
                                onClick={onClose}
                                className='absolute -top-12 right-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors'
                            >
                                <X size={18} />
                            </button>
                            
                            <div className='flex justify-center'>
                                {mode === 'signin' ? (
                                    <SignIn 
                                        routing='hash' 
                                        signUpUrl='#' 
                                        afterSignInUrl='/'
                                    />
                                ) : (
                                    <SignUp 
                                        routing='hash' 
                                        signInUrl='#' 
                                        afterSignUpUrl='/'
                                    />
                                )}
                            </div>
                            
                            <div className='mt-4 text-center'>
                                <button 
                                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                                    className='text-sm text-gray-400 hover:text-white transition-colors'
                                >
                                    {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
