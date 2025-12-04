import { memo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Globe, Clock, Search, Loader2 } from 'lucide-react';
import type { SearchResult } from '../../lib/webSearch';

interface SearchResultsCardProps {
    results: SearchResult[];
    query: string;
    searchTime?: number;
    isSearching?: boolean;
}

function SearchResultsCardComponent({ results, query, searchTime, isSearching }: SearchResultsCardProps) {
    if (isSearching) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 rounded-xl border border-[#30363d] bg-[#161b22]/80 backdrop-blur-sm"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                        <Loader2 size={18} className="text-orange-400 animate-spin" />
                    </div>
                    <div>
                        <p className="text-sm text-[#c9d1d9]">Searching the web...</p>
                        <p className="text-xs text-[#8b949e]">"{query}"</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (results.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4 rounded-xl border border-[#30363d] bg-[#161b22]/80 backdrop-blur-sm overflow-hidden"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#30363d] bg-[#0d1117]/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-orange-500/10">
                        <Search size={14} className="text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-[#c9d1d9]">Web Search Results</span>
                </div>
                {searchTime && (
                    <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
                        <Clock size={12} />
                        <span>{(searchTime / 1000).toFixed(2)}s</span>
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="p-2 space-y-1 max-h-[280px] overflow-y-auto">
                {results.map((result, index) => (
                    <a
                        key={index}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg hover:bg-[#21262d] transition-colors group"
                    >
                        <div className="flex items-start gap-3">
                            {/* Index badge */}
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-[#30363d] text-[10px] font-medium text-[#8b949e] flex items-center justify-center">
                                {index + 1}
                            </span>

                            <div className="flex-1 min-w-0">
                                {/* Source */}
                                <div className="flex items-center gap-2 mb-1">
                                    {result.favicon && (
                                        <img
                                            src={result.favicon}
                                            alt=""
                                            className="w-4 h-4 rounded"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <span className="text-xs text-[#8b949e] truncate">
                                        {result.source}
                                    </span>
                                </div>

                                {/* Title */}
                                <h4 className="text-sm font-medium text-orange-400 group-hover:underline line-clamp-1">
                                    {result.title}
                                </h4>

                                {/* Snippet */}
                                {result.snippet && (
                                    <p className="text-xs text-[#8b949e] mt-1 line-clamp-2">
                                        {result.snippet}
                                    </p>
                                )}
                            </div>

                            <ExternalLink size={14} className="flex-shrink-0 text-[#484f58] group-hover:text-[#8b949e] mt-1" />
                        </div>
                    </a>
                ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-[#30363d] bg-[#0d1117]/50">
                <p className="text-[10px] text-[#8b949e] flex items-center gap-1.5">
                    <Globe size={10} />
                    Results from multiple sources • Click to view full article
                </p>
            </div>
        </motion.div>
    );
}

export const SearchResultsCard = memo(SearchResultsCardComponent);

// Inline citation component for use in message text
interface CitationBadgeProps {
    index: number;
    url: string;
    title?: string;
}

export function CitationBadge({ index, url, title }: CitationBadgeProps) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={title || url}
            className="inline-flex items-center justify-center w-4 h-4 mx-0.5 text-[10px] font-medium bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 transition-colors cursor-pointer align-super"
        >
            {index}
        </a>
    );
}

// Sources footer component
interface SourcesFooterProps {
    results: SearchResult[];
}

export function SourcesFooter({ results }: SourcesFooterProps) {
    if (results.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-[#30363d]">
            <p className="text-xs text-[#8b949e] mb-2 flex items-center gap-1.5">
                <Globe size={12} />
                Sources
            </p>
            <div className="flex flex-wrap gap-2">
                {results.map((result, index) => (
                    <a
                        key={index}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] rounded-md transition-colors"
                    >
                        <span className="w-4 h-4 rounded bg-[#30363d] text-[10px] font-medium flex items-center justify-center">
                            {index + 1}
                        </span>
                        {result.favicon && (
                            <img src={result.favicon} alt="" className="w-3 h-3 rounded" />
                        )}
                        <span className="truncate max-w-[120px]">{result.source}</span>
                    </a>
                ))}
            </div>
        </div>
    );
}
