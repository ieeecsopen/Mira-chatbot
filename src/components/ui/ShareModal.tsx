import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Link, Share2, Clock, Eye } from 'lucide-react';
import { Button } from './button';
import { shareChat, getShareUrl } from '../../lib/shareChat';
import type { ChatSession } from '../../lib/chatStorage';
import { showSuccess, showError } from '../../lib/toast';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: ChatSession | null;
}

export function ShareModal({ isOpen, onClose, session }: ShareModalProps) {
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = useCallback(async () => {
        if (!session || session.messages.length === 0) {
            showError('Cannot share empty conversation');
            return;
        }

        setIsSharing(true);
        try {
            // Small delay for UX
            await new Promise(resolve => setTimeout(resolve, 300));
            const shareId = shareChat(session);
            const url = getShareUrl(shareId);
            setShareUrl(url);
            showSuccess('Share link created!');
        } catch (error) {
            showError('Failed to create share link');
            console.error('Share error:', error);
        } finally {
            setIsSharing(false);
        }
    }, [session]);

    const handleCopy = useCallback(async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            showSuccess('Link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            showError('Failed to copy link');
        }
    }, [shareUrl]);

    const handleClose = useCallback(() => {
        setShareUrl(null);
        setCopied(false);
        onClose();
    }, [onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
                    >
                        <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-orange-500/10">
                                        <Share2 size={20} className="text-orange-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">Share Conversation</h2>
                                        <p className="text-sm text-[#8b949e]">
                                            {session?.messages.length || 0} messages
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 rounded-lg text-[#8b949e] hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                {!shareUrl ? (
                                    // Initial state - create share link
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]">
                                            <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                                                <Link size={16} />
                                                Create Share Link
                                            </h3>
                                            <p className="text-sm text-[#8b949e] mb-4">
                                                Anyone with the link can view this conversation.
                                                The link expires in 30 days.
                                            </p>
                                            <div className="flex items-center gap-3 text-xs text-[#8b949e]">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    Expires in 30 days
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Eye size={12} />
                                                    Read-only access
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleShare}
                                            disabled={isSharing || !session || session.messages.length === 0}
                                            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                                        >
                                            {isSharing ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Creating link...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Share2 size={16} />
                                                    Create Share Link
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    // Share link created
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                            <div className="flex items-center gap-2 text-green-400 mb-2">
                                                <Check size={16} />
                                                <span className="font-medium">Link Created!</span>
                                            </div>
                                            <p className="text-sm text-[#8b949e]">
                                                Your conversation is now shareable.
                                            </p>
                                        </div>

                                        {/* Share URL */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={shareUrl}
                                                readOnly
                                                className="flex-1 px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#c9d1d9] text-sm focus:outline-none focus:border-orange-500"
                                            />
                                            <Button
                                                onClick={handleCopy}
                                                variant="outline"
                                                className="px-4 py-3 border-[#30363d] hover:bg-white/5"
                                            >
                                                {copied ? (
                                                    <Check size={18} className="text-green-500" />
                                                ) : (
                                                    <Copy size={18} />
                                                )}
                                            </Button>
                                        </div>

                                        <p className="text-xs text-center text-[#8b949e]">
                                            Link expires in 30 days
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
