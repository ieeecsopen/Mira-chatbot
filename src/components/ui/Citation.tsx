/**
 * Citation Component for MIRA
 * Displays document citations with source attribution
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Book } from 'lucide-react';
import type { DocumentMatch } from '../../lib/documentStore';

export interface CitationData {
    id: number;
    documentName: string;
    pageNumber?: number;
    sectionTitle?: string;
    snippet: string;
    relevanceScore: number;
    matchType: 'semantic' | 'keyword' | 'hybrid';
}

interface CitationBadgeProps {
    number: number;
    onClick?: () => void;
    isActive?: boolean;
}

export function CitationBadge({ number, onClick, isActive }: CitationBadgeProps) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 
        text-[10px] font-semibold rounded-md cursor-pointer transition-all
        ${isActive
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                }`}
        >
            {number}
        </button>
    );
}

interface CitationPanelProps {
    citations: CitationData[];
    onCitationClick?: (citation: CitationData) => void;
}

export function CitationPanel({ citations, onCitationClick }: CitationPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedCitation, setExpandedCitation] = useState<number | null>(null);

    if (citations.length === 0) return null;

    const matchTypeColors = {
        semantic: 'bg-blue-500/20 text-blue-400',
        keyword: 'bg-green-500/20 text-green-400',
        hybrid: 'bg-purple-500/20 text-purple-400',
    };

    const matchTypeLabels = {
        semantic: 'Semantic',
        keyword: 'Keyword',
        hybrid: 'Hybrid',
    };

    return (
        <div className="mt-3 border border-white/10 rounded-xl overflow-hidden bg-[#0d1117]/50">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 
          text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Book size={14} className="text-purple-400" />
                    <span className="font-medium">
                        {citations.length} Source{citations.length !== 1 ? 's' : ''} Cited
                    </span>
                </div>
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Citation List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 space-y-2">
                            {citations.map((citation) => (
                                <div
                                    key={citation.id}
                                    className="p-2 rounded-lg bg-white/5 border border-white/5 
                    hover:border-purple-500/30 transition-colors cursor-pointer"
                                    onClick={() => {
                                        setExpandedCitation(expandedCitation === citation.id ? null : citation.id);
                                        onCitationClick?.(citation);
                                    }}
                                >
                                    {/* Citation Header */}
                                    <div className="flex items-start gap-2">
                                        <CitationBadge number={citation.id} isActive={expandedCitation === citation.id} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-white text-sm truncate">
                                                    {citation.documentName}
                                                </span>
                                                {citation.pageNumber && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                                                        Page {citation.pageNumber}
                                                    </span>
                                                )}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${matchTypeColors[citation.matchType]}`}>
                                                    {matchTypeLabels[citation.matchType]}
                                                </span>
                                            </div>
                                            {citation.sectionTitle && (
                                                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                                                    § {citation.sectionTitle}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-gray-500">
                                            {Math.round(citation.relevanceScore * 100)}%
                                        </span>
                                    </div>

                                    {/* Expanded Snippet */}
                                    <AnimatePresence>
                                        {expandedCitation === citation.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="mt-2 pt-2 border-t border-white/5"
                                            >
                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                    "{citation.snippet}"
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Convert DocumentMatch array to CitationData array
 */
export function documentMatchesToCitations(matches: DocumentMatch[]): CitationData[] {
    return matches.map((match, index) => ({
        id: index + 1,
        documentName: match.citation.documentName,
        pageNumber: match.citation.pageNumber,
        sectionTitle: match.citation.sectionTitle,
        snippet: match.citation.snippet,
        relevanceScore: match.citation.relevanceScore,
        matchType: match.citation.matchType,
    }));
}

/**
 * Parse citation references from AI response text
 * Replaces [1], [2], etc. with interactive badges
 */
export function parseCitations(text: string): {
    segments: Array<{ type: 'text' | 'citation'; content: string; citationNumber?: number }>
} {
    const segments: Array<{ type: 'text' | 'citation'; content: string; citationNumber?: number }> = [];
    const citationRegex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
        // Add text before citation
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: text.slice(lastIndex, match.index),
            });
        }

        // Add citation
        segments.push({
            type: 'citation',
            content: match[0],
            citationNumber: parseInt(match[1], 10),
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            content: text.slice(lastIndex),
        });
    }

    return { segments };
}
