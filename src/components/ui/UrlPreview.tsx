import { useState, useEffect, memo } from 'react';
import { ExternalLink, Globe, Image as ImageIcon } from 'lucide-react';

interface OpenGraphData {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    url: string;
    favicon?: string;
}

interface UrlPreviewProps {
    url: string;
}

// Simple URL validation
function isValidUrl(string: string): boolean {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// Extract domain from URL
function getDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return url;
    }
}

// Fetch Open Graph data using a CORS proxy or direct fetch
async function fetchOpenGraphData(url: string): Promise<OpenGraphData | null> {
    try {
        // Use a public CORS proxy for fetching metadata
        // In production, you'd want your own backend endpoint
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(5000),
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch');
        }
        
        const html = await response.text();
        
        // Parse the HTML to extract Open Graph data
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const getMetaContent = (property: string): string | undefined => {
            const meta = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
            return meta?.getAttribute('content') || undefined;
        };

        const title = getMetaContent('og:title') || 
                     getMetaContent('twitter:title') || 
                     doc.querySelector('title')?.textContent || 
                     undefined;
                     
        const description = getMetaContent('og:description') || 
                           getMetaContent('twitter:description') || 
                           getMetaContent('description') || 
                           undefined;
                           
        const image = getMetaContent('og:image') || 
                     getMetaContent('twitter:image') || 
                     undefined;
                     
        const siteName = getMetaContent('og:site_name') || getDomain(url);
        
        // Get favicon
        const faviconLink = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
        let favicon = faviconLink?.getAttribute('href');
        if (favicon && !favicon.startsWith('http')) {
            const urlObj = new URL(url);
            favicon = `${urlObj.origin}${favicon.startsWith('/') ? '' : '/'}${favicon}`;
        }
        if (!favicon) {
            favicon = `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`;
        }

        return {
            title,
            description,
            image,
            siteName,
            url,
            favicon,
        };
    } catch (error) {
        console.error('Failed to fetch Open Graph data:', error);
        // Return basic data even if fetch fails
        return {
            url,
            siteName: getDomain(url),
            favicon: `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`,
        };
    }
}

function UrlPreviewComponent({ url }: UrlPreviewProps) {
    const [data, setData] = useState<OpenGraphData | null>(null);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        if (!isValidUrl(url)) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        fetchOpenGraphData(url).then((result) => {
            if (!cancelled) {
                setData(result);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [url]);

    if (!isValidUrl(url)) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline inline-flex items-center gap-1"
            >
                {url}
                <ExternalLink size={12} />
            </a>
        );
    }

    if (loading) {
        return (
            <div className="my-3 rounded-lg border border-[#30363d] bg-[#161b22] p-4 animate-pulse">
                <div className="flex gap-4">
                    <div className="w-24 h-24 bg-[#21262d] rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-[#21262d] rounded w-3/4" />
                        <div className="h-3 bg-[#21262d] rounded w-full" />
                        <div className="h-3 bg-[#21262d] rounded w-2/3" />
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline inline-flex items-center gap-1"
            >
                {url}
                <ExternalLink size={12} />
            </a>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group my-3 block rounded-lg border border-[#30363d] bg-[#161b22] hover:border-orange-400 hover:bg-[#1c2128] transition-all duration-200 overflow-hidden"
        >
            <div className="flex">
                {/* Image preview */}
                {data.image && !imageError ? (
                    <div className="w-32 h-28 flex-shrink-0 bg-[#21262d] overflow-hidden">
                        <img
                            src={data.image}
                            alt={data.title || 'Preview'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={() => setImageError(true)}
                        />
                    </div>
                ) : (
                    <div className="w-20 h-28 flex-shrink-0 bg-[#21262d] flex items-center justify-center">
                        <ImageIcon size={24} className="text-[#484f58]" />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 p-3 min-w-0">
                    {/* Site info */}
                    <div className="flex items-center gap-2 mb-1.5">
                        {data.favicon ? (
                            <img
                                src={data.favicon}
                                alt=""
                                className="w-4 h-4 rounded"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <Globe size={14} className="text-[#8b949e]" />
                        )}
                        <span className="text-xs text-[#8b949e] truncate">
                            {data.siteName || getDomain(url)}
                        </span>
                    </div>

                    {/* Title */}
                    {data.title && (
                        <h4 className="text-sm font-semibold text-[#c9d1d9] group-hover:text-orange-400 line-clamp-1 mb-1 transition-colors">
                            {data.title}
                        </h4>
                    )}

                    {/* Description */}
                    {data.description && (
                        <p className="text-xs text-[#8b949e] line-clamp-2">
                            {data.description}
                        </p>
                    )}

                    {/* URL display */}
                    {!data.title && !data.description && (
                        <p className="text-sm text-orange-400 truncate flex items-center gap-1">
                            {getDomain(url)}
                            <ExternalLink size={12} />
                        </p>
                    )}
                </div>
            </div>
        </a>
    );
}

export const UrlPreview = memo(UrlPreviewComponent);

// Helper to detect URLs in text
export function extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    return text.match(urlRegex) || [];
}
