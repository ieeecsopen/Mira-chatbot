/**
 * Web Search Integration Module
 * Provides real-time web search capabilities using multiple search providers
 */

import { withRetry } from './retry';
import { scrapeUrls, smartScrape, type ScrapedContent } from './webScraper';

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source: string;
    favicon?: string;
    publishedDate?: string;
    scrapedContent?: ScrapedContent;
    fullContent?: string;
}

export interface WebSearchResponse {
    query: string;
    results: SearchResult[];
    searchTime: number;
    error?: string;
    scrapingEnabled?: boolean;
}

// Search API keys (from environment variables)
const BRAVE_API_KEY = import.meta.env.VITE_BRAVE_API_KEY || '';
const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || '';

// Search configuration
const SEARCH_CONFIG = {
    maxResults: 10,
    timeout: 10000,
    minRelevanceScore: 0.3,
    enableScraping: true,
    maxScrapedResults: 3,
    preferRecent: true, // Prefer recent results for time-sensitive queries
};

/**
 * Lightweight lexical re-ranker to push more relevant results to the top.
 * Now includes freshness scoring for time-sensitive queries.
 */
function reRankResults(query: string, results: SearchResult[]): SearchResult[] {
    if (!results.length) return results;

    const terms = query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

    const isRecent = isTimeSensitive(query);

    const scoreResult = (result: SearchResult, index: number) => {
        const haystack = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();
        let score = 0;

        // Lexical relevance scoring
        for (const term of terms) {
            if (!term) continue;
            const termCount = haystack.split(term).length - 1;
            score += termCount * 2; // title/snippet hits
            if ((result.title || '').toLowerCase().includes(term)) score += 3;
            if ((result.source || '').toLowerCase().includes(term)) score += 1;
        }

        // Freshness bonus for time-sensitive queries
        if (isRecent && result.publishedDate) {
            const dateStr = result.publishedDate.toLowerCase();
            // Check for recent indicators
            if (dateStr.includes('hour') || dateStr.includes('ago') || dateStr.includes('today')) {
                score += 10;
            } else if (dateStr.includes('yesterday') || dateStr.includes('day ago')) {
                score += 7;
            } else if (dateStr.includes('week') || dateStr.includes('2024') || dateStr.includes('2025')) {
                score += 5;
            }
        }

        // Quality source bonus
        const trustedDomains = ['wikipedia.org', 'reuters.com', 'bbc.com', 'nytimes.com', 'theguardian.com'];
        if (trustedDomains.some(domain => result.source.includes(domain))) {
            score += 2;
        }

        // Small positional bonus to prefer earlier results when scores tie
        return score - index * 0.01;
    };

    return [...results]
        .map((r, idx) => ({ r, score: scoreResult(r, idx) }))
        .sort((a, b) => b.score - a.score)
        .map(({ r }) => r)
        .slice(0, SEARCH_CONFIG.maxResults);
}

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
 * Detect if query is time-sensitive
 */
function isTimeSensitive(query: string): boolean {
    const timeKeywords = [
        /\b(today|yesterday|now|current|latest|recent|this\s+week|this\s+month|2024|2025)\b/i,
        /\b(news|happening|update|announced|released)\b/i,
        /\b(price|stock|weather|score|result)\b/i,
    ];
    return timeKeywords.some(pattern => pattern.test(query));
}

/**
 * Search using Brave Search API (best for real-time results)
 * Requires API key from https://brave.com/search/api/
 */
async function searchBrave(query: string): Promise<SearchResult[]> {
    if (!BRAVE_API_KEY) {
        console.log('⚠️ Brave API key not configured');
        return [];
    }

    try {
        const { success, data: response, error: fetchError } = await withRetry(
            () => fetch(
                `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&freshness=${isTimeSensitive(query) ? 'pd' : 'pw'}`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'X-Subscription-Token': BRAVE_API_KEY,
                    },
                    signal: AbortSignal.timeout(SEARCH_CONFIG.timeout)
                }
            ),
            {
                maxAttempts: 2,
                initialDelayMs: 300,
            }
        );

        if (!success || !response) {
            throw fetchError || new Error('Brave search failed');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const results: SearchResult[] = [];

        if (data.web?.results) {
            for (const result of data.web.results.slice(0, SEARCH_CONFIG.maxResults)) {
                results.push({
                    title: result.title || 'Untitled',
                    url: result.url,
                    snippet: result.description || '',
                    source: getDomain(result.url),
                    favicon: getFavicon(result.url),
                    publishedDate: result.age || result.extra_snippets?.[0],
                });
            }
        }

        console.log(`✅ Brave Search returned ${results.length} results`);
        return results;
    } catch (error) {
        console.warn('Brave search failed:', error);
        return [];
    }
}

/**
 * Search using Serper API (Google Search API alternative)
 * Requires API key from https://serper.dev
 */
async function searchSerper(query: string): Promise<SearchResult[]> {
    if (!SERPER_API_KEY) {
        console.log('⚠️ Serper API key not configured');
        return [];
    }

    try {
        const { success, data: response, error: fetchError } = await withRetry(
            () => fetch(
                'https://google.serper.dev/search',
                {
                    method: 'POST',
                    headers: {
                        'X-API-KEY': SERPER_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        q: query,
                        num: SEARCH_CONFIG.maxResults,
                        gl: 'us',
                        hl: 'en',
                    }),
                    signal: AbortSignal.timeout(SEARCH_CONFIG.timeout)
                }
            ),
            {
                maxAttempts: 2,
                initialDelayMs: 300,
            }
        );

        if (!success || !response) {
            throw fetchError || new Error('Serper search failed');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const results: SearchResult[] = [];

        if (data.organic) {
            for (const result of data.organic.slice(0, SEARCH_CONFIG.maxResults)) {
                results.push({
                    title: result.title || 'Untitled',
                    url: result.link,
                    snippet: result.snippet || '',
                    source: getDomain(result.link),
                    favicon: getFavicon(result.link),
                    publishedDate: result.date,
                });
            }
        }

        console.log(`✅ Serper returned ${results.length} results`);
        return results;
    } catch (error) {
        console.warn('Serper search failed:', error);
        return [];
    }
}

/**
 * Search using DuckDuckGo Instant Answer API (free, no API key needed)
 * Note: This is limited but works without authentication
 */
async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    try {
        const { success, data: response, error: fetchError } = await withRetry(
            () => fetch(
                `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
                { signal: AbortSignal.timeout(SEARCH_CONFIG.timeout) }
            ),
            {
                maxAttempts: 3,
                initialDelayMs: 300,
            }
        );

        if (!success || !response) {
            throw fetchError || new Error('DuckDuckGo search failed');
        }

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
    // List of public SearXNG instances - updated with more reliable ones
    const instances = [
        'https://searx.be',
        'https://search.sapti.me',
        'https://searx.work',
        'https://search.bus-hit.me',
    ];

    // Add time range for time-sensitive queries
    const timeRange = isTimeSensitive(query) ? '&time_range=day' : '&time_range=';

    for (const instance of instances) {
        try {
            const { success, data: response, error: fetchError } = await withRetry(
                () => fetch(
                    `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general${timeRange}`,
                    { 
                        signal: AbortSignal.timeout(SEARCH_CONFIG.timeout),
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        }
                    }
                ),
                {
                    maxAttempts: 2,
                    initialDelayMs: 300,
                }
            );

            if (!success || !response) {
                throw fetchError || new Error('SearXNG request failed');
            }

            if (!response.ok) continue;

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const results = data.results.slice(0, SEARCH_CONFIG.maxResults).map((r: any) => ({
                    title: r.title || 'Untitled',
                    url: r.url,
                    snippet: r.content || r.snippet || '',
                    source: getDomain(r.url),
                    favicon: getFavicon(r.url),
                    publishedDate: r.publishedDate || r.parsed_url?.[0],
                }));
                
                console.log(`✅ SearXNG (${instance}) returned ${results.length} results`);
                return results;
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

        const { success, data: response, error: fetchError } = await withRetry(
            () => fetch(proxyUrl, {
                signal: AbortSignal.timeout(SEARCH_CONFIG.timeout),
            }),
            {
                maxAttempts: 2,
                initialDelayMs: 300,
            }
        );

        if (!success || !response) {
            throw fetchError || new Error('Proxy search failed');
        }

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

    console.log(`🔍 Web search: "${query}" [Time-sensitive: ${isTimeSensitive(query)}]`);

    // Try Brave Search first (best for real-time, fresh results)
    if (BRAVE_API_KEY) {
        console.log('📡 Trying Brave Search...');
        results = await searchBrave(query);
    }

    // Try Serper API (Google alternative)
    if (results.length === 0 && SERPER_API_KEY) {
        console.log('📡 Falling back to Serper...');
        results = await searchSerper(query);
    }

    // Try SearXNG
    if (results.length === 0) {
        console.log('📡 Falling back to SearXNG...');
        results = await searchSearXNG(query);
    }

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

    // Re-rank for relevance and trim
    results = reRankResults(query, results);

    // Scrape top results for detailed content
    if (SEARCH_CONFIG.enableScraping && results.length > 0) {
        console.log(`🔍 Scraping top ${Math.min(results.length, SEARCH_CONFIG.maxScrapedResults)} results...`);
        
        const urlsToScrape = results
            .slice(0, SEARCH_CONFIG.maxScrapedResults)
            .map(r => r.url);
        
        try {
            const scrapedContents = await scrapeUrls(urlsToScrape, {
                timeout: 8000,
                maxContentLength: 10000,
            });

            // Attach scraped content to results
            scrapedContents.forEach((scraped, index) => {
                if (results[index] && !scraped.error) {
                    results[index].scrapedContent = scraped;
                    results[index].fullContent = scraped.content;
                    // Enhance snippet with scraped content if original snippet is short
                    if (results[index].snippet.length < 100 && scraped.content.length > 0) {
                        results[index].snippet = scraped.content.substring(0, 300) + '...';
                    }
                }
            });
            
            console.log(`✅ Scraped ${scrapedContents.filter(s => !s.error).length} pages successfully`);
        } catch (error) {
            console.warn('Web scraping failed:', error);
        }
    }

    const searchTime = Date.now() - startTime;
    console.log(`✅ Search completed in ${searchTime}ms, found ${results.length} results`);

    return {
        query,
        results,
        searchTime,
        error,
        scrapingEnabled: SEARCH_CONFIG.enableScraping,
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
        
        // Use full scraped content if available, otherwise use snippet
        if (result.fullContent && result.fullContent.length > result.snippet.length) {
            context += `   Content: ${result.fullContent.substring(0, 1500)}${result.fullContent.length > 1500 ? '...' : ''}\n`;
        } else if (result.snippet) {
            context += `   Summary: ${result.snippet}\n`;
        }
        
        // Add metadata if available
        if (result.scrapedContent?.metadata) {
            const meta = result.scrapedContent.metadata;
            if (meta.author) context += `   Author: ${meta.author}\n`;
            if (meta.publishDate) context += `   Published: ${meta.publishDate}\n`;
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

        // Sinhala Triggers
        /කවුද/i, // Who
        /මොකක්ද/i, // What
        /කොහේද/i, // Where
        /කවදාද/i, // When
        /කෙසේද/i, // How
        /ඇයි/i, // Why
        /කීයද/i, // How much
        /විස්තර/i, // Details
        /තොරතුරු/i, // Information
        /ගැන/i, // About
        /අලුත්/i, // New/Latest
        /පුවත්/i, // News
        /වර්තමාන/i, // Current
        /මිල/i, // Price
        /කාලගුණය/i, // Weather

        // Singlish Triggers
        /kawda/i, // Who
        /mokakda/i, // What
        /koheda/i, // Where
        /kawadada/i, // When
        /kohomada/i, // How
        /ai/i, // Why
        /keeyada/i, // How much
        /wisthara/i, // Details
        /thorathuru/i, // Information
        /gana/i, // About
        /aluth/i, // New/Latest
        /news/i, // News
        /current/i, // Current
        /price/i, // Price
        /weather/i, // Weather
        /lankawe/i, // In Sri Lanka
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

/**
 * Enable or disable web scraping
 */
export function setScrapingEnabled(enabled: boolean): void {
    SEARCH_CONFIG.enableScraping = enabled;
    console.log(`🌐 Web scraping ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get current scraping status
 */
export function isScrapingEnabled(): boolean {
    return SEARCH_CONFIG.enableScraping;
}

/**
 * Scrape a single URL directly (for use outside of search)
 */
export async function scrapeSingleUrl(url: string): Promise<ScrapedContent> {
    return smartScrape(url);
}
