import { SignIn, SignUp } from '@clerk/clerk-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

export function AuthPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className='min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-4 relative overflow-hidden'>
            {/* Background Effects */}
            <div className='absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none'>
                <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[100px]' />
                <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]' />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className='w-full max-w-md relative z-10'
            >
                <button
                    onClick={() => navigate('/')}
                    className='mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors'
                >
                    <ArrowLeft size={20} />
                    <span>Back to Chat</span>
                </button>

                <div className='flex justify-center'>
                    {mode === 'signup' ? (
                        <SignUp routing='hash' signInUrl='/auth?mode=signin' />
                    ) : (
                        <SignIn routing='hash' signUpUrl='/auth?mode=signup' />
                    )}
                </div>
            </motion.div>
        </div>
    );
}
