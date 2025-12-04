/**
 * Web Search Integration Module
 * Provides real-time web search capabilities using multiple search providers
 */

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source: string;
    favicon?: string;
    publishedDate?: string;
}

export interface WebSearchResponse {
    query: string;
    results: SearchResult[];
    searchTime: number;
    error?: string;
}

// Search configuration
const SEARCH_CONFIG = {
    maxResults: 5,
    timeout: 8000,
    minRelevanceScore: 0.3,
};

/**
 * Extract domain from URL
 */
function getDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return url;
    }
}

/**
 * Get favicon URL for a domain
 */
function getFavicon(url: string): string {
    const domain = getDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Search using DuckDuckGo Instant Answer API (free, no API key needed)
 * Note: This is limited but works without authentication
 */
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    try {
        const response = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
            { signal: AbortSignal.timeout(SEARCH_CONFIG.timeout) }
        );

        if (!response.ok) throw new Error('DuckDuckGo search failed');

        const data = await response.json();
        const results: SearchResult[] = [];

        // Abstract (main answer)
        if (data.Abstract && data.AbstractURL) {
            results.push({
                title: data.Heading || query,
                url: data.AbstractURL,
                snippet: data.Abstract,
                source: data.AbstractSource || getDomain(data.AbstractURL),
                favicon: getFavicon(data.AbstractURL),
            });
        }

        // Related topics
        if (data.RelatedTopics) {
            for (const topic of data.RelatedTopics.slice(0, 4)) {
                if (topic.FirstURL && topic.Text) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 60),
                        url: topic.FirstURL,
                        snippet: topic.Text,
                        source: getDomain(topic.FirstURL),
                        favicon: getFavicon(topic.FirstURL),
                    });
                }
            }
        }

        return results;
    } catch (error) {
        console.warn('DuckDuckGo search failed:', error);
        return [];
    }
}

/**
 * Search using SearXNG public instances (privacy-focused meta search)
 */
async function searchSearXNG(query: string): Promise<SearchResult[]> {
    // List of public SearXNG instances
    const instances = [
        'https://search.bus-hit.me',
        'https://searx.be',
        'https://search.sapti.me',
    ];

    for (const instance of instances) {
        try {
            const response = await fetch(
                `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general`,
                { 
                    signal: AbortSignal.timeout(SEARCH_CONFIG.timeout),
                    headers: {
                        'Accept': 'application/json',
                    }
                }
            );

            if (!response.ok) continue;

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                return data.results.slice(0, SEARCH_CONFIG.maxResults).map((r: any) => ({
                    title: r.title || 'Untitled',
                    url: r.url,
                    snippet: r.content || r.snippet || '',
                    source: getDomain(r.url),
                    favicon: getFavicon(r.url),
                    publishedDate: r.publishedDate,
                }));
            }
        } catch (error) {
            console.warn(`SearXNG instance ${instance} failed:`, error);
            continue;
        }
    }

    return [];
}

/**
 * Fallback: Use a CORS proxy to scrape Google search results
 * This is a last resort option
 */
async function searchWithProxy(query: string): Promise<SearchResult[]> {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
            `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5`
        )}`;

        const response = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(SEARCH_CONFIG.timeout),
        });

        if (!response.ok) throw new Error('Proxy search failed');

        const html = await response.text();
        const results: SearchResult[] = [];

        // Simple regex parsing for search results (limited but works)
        const titleMatches = html.match(/<h3[^>]*>([^<]+)<\/h3>/g) || [];
        const linkMatches = html.match(/href="\/url\?q=([^&"]+)/g) || [];

        for (let i = 0; i < Math.min(titleMatches.length, linkMatches.length, 5); i++) {
            const title = titleMatches[i]?.replace(/<[^>]+>/g, '') || '';
            let url = linkMatches[i]?.replace('href="/url?q=', '') || '';
            url = decodeURIComponent(url);

            if (title && url && url.startsWith('http')) {
                results.push({
                    title,
                    url,
                    snippet: '',
                    source: getDomain(url),
                    favicon: getFavicon(url),
                });
            }
        }

        return results;
    } catch (error) {
        console.warn('Proxy search failed:', error);
        return [];
    }
}

/**
 * Main search function - tries multiple providers
 */
export async function webSearch(query: string): Promise<WebSearchResponse> {
    const startTime = Date.now();
    let results: SearchResult[] = [];
    let error: string | undefined;

    console.log(`🔍 Web search: "${query}"`);

    // Try SearXNG first (best results)
    results = await searchSearXNG(query);

    // Fallback to DuckDuckGo
    if (results.length === 0) {
        console.log('📡 Falling back to DuckDuckGo...');
        results = await searchDuckDuckGo(query);
    }

    // Last resort: proxy scraping
    if (results.length === 0) {
        console.log('📡 Falling back to proxy search...');
        results = await searchWithProxy(query);
    }

    if (results.length === 0) {
        error = 'No search results found. Please try a different query.';
    }

    const searchTime = Date.now() - startTime;
    console.log(`✅ Search completed in ${searchTime}ms, found ${results.length} results`);

    return {
        query,
        results,
        searchTime,
        error,
    };
}

/**
 * Format search results for AI context
 */
export function formatSearchResultsForAI(results: SearchResult[]): string {
    if (results.length === 0) return '';

    let context = '### Web Search Results:\n\n';
    
    results.forEach((result, index) => {
        context += `[${index + 1}] **${result.title}**\n`;
        context += `   Source: ${result.source}\n`;
        context += `   URL: ${result.url}\n`;
        if (result.snippet) {
            context += `   Summary: ${result.snippet}\n`;
        }
        context += '\n';
    });

    context += '\n**Instructions:** Use the above search results to provide an accurate, up-to-date answer. Cite sources using [1], [2], etc. when referencing information from specific results.\n';

    return context;
}

/**
 * Check if a query should trigger web search
 */
export function shouldSearchWeb(query: string): boolean {
    const searchTriggers = [
        // Explicit triggers
        /^search\s+/i,
        /^google\s+/i,
        /^look\s+up\s+/i,
        /^find\s+/i,
        /^what\s+is\s+the\s+latest/i,
        /^current\s+/i,
        /^recent\s+/i,
        /^news\s+about/i,
        
        // Question patterns that benefit from search
        /what\s+happened/i,
        /who\s+won/i,
        /when\s+did/i,
        /price\s+of/i,
        /weather\s+in/i,
        /stock\s+price/i,
        /latest\s+news/i,
        /how\s+much\s+is/i,
        /where\s+is/i,
        /who\s+is\s+the\s+current/i,
    ];

    return searchTriggers.some(pattern => pattern.test(query));
}

/**
 * Extract search query from user message
 */
export function extractSearchQuery(message: string): string {
    // Remove common prefixes
    let query = message
        .replace(/^(search|google|look\s+up|find|search\s+for)\s+/i, '')
        .replace(/^(what\s+is|who\s+is|where\s+is|when\s+is)\s+/i, '$1 ')
        .trim();

    // Limit query length
    if (query.length > 150) {
        query = query.substring(0, 150);
    }

    return query;
}
