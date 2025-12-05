import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowLeft, Calendar, Eye, Share2 } from 'lucide-react';
import { MessageBubble } from '../MessageBubble';
import { getSharedChat, type SharedChat } from '../../lib/shareChat';
import { Button } from './button';

interface SharedChatViewProps {
    shareId: string;
    onBack: () => void;
}

export function SharedChatView({ shareId, onBack }: SharedChatViewProps) {
    const [chat, setChat] = useState<SharedChat | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadChat = async () => {
            setLoading(true);
            // Small delay for smooth transition
            await new Promise(resolve => setTimeout(resolve, 200));

            const sharedChat = getSharedChat(shareId);
            if (sharedChat) {
                setChat(sharedChat);
            } else {
                setError('This shared conversation was not found or has expired.');
            }
            setLoading(false);
        };

        loadChat();
    }, [shareId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                    <p className="text-[#8b949e]">Loading shared conversation...</p>
                </motion.div>
            </div>
        );
    }

    if (error || !chat) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md text-center"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Share2 size={32} className="text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">
                        Conversation Not Found
                    </h1>
                    <p className="text-[#8b949e] mb-6">
                        {error || 'This shared conversation does not exist or has expired.'}
                    </p>
                    <Button
                        onClick={onBack}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Go to Mira
                    </Button>
                </motion.div>
            </div>
        );
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
            {/* Header */}
            <motion.header
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="sticky top-0 z-10 border-b border-[#30363d] bg-[#0a0a0a]/80 backdrop-blur-xl"
            >
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={onBack}
                                className="text-[#8b949e] hover:text-white"
                            >
                                <ArrowLeft size={20} />
                            </Button>
                            <div>
                                <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <MessageSquare size={18} className="text-orange-400" />
                                    {chat.title}
                                </h1>
                                <div className="flex items-center gap-4 text-xs text-[#8b949e]">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        Shared {formatDate(chat.sharedAt)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Eye size={12} />
                                        {chat.viewCount} views
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 text-xs bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">
                                Shared Conversation
                            </span>
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Messages */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {chat.messages.map((msg, index) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <MessageBubble
                                    role={msg.role}
                                    content={msg.content}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#30363d] bg-[#0a0a0a]/80 backdrop-blur-xl py-4">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <p className="text-sm text-[#8b949e]">
                        This is a read-only view of a shared conversation.
                    </p>
                    <Button
                        onClick={onBack}
                        variant="link"
                        className="text-orange-400 hover:text-orange-300 mt-2"
                    >
                        Start your own conversation with Mira →
                    </Button>
                </div>
            </footer>
        </div>
    );
}
