/**
 * Web Scraping Module
 * Provides advanced web scraping capabilities using Cheerio
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
    title: string;
    description: string;
    content: string;
    url: string;
    images: string[];
    links: string[];
    metadata: {
        author?: string;
        publishDate?: string;
        keywords?: string[];
        siteName?: string;
    };
    error?: string;
}

export interface ScraperOptions {
    timeout?: number;
    maxContentLength?: number;
    extractImages?: boolean;
    extractLinks?: boolean;
    userAgent?: string;
}

const DEFAULT_OPTIONS: ScraperOptions = {
    timeout: 10000,
    maxContentLength: 50000,
    extractImages: false,
    extractLinks: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/**
 * Clean and normalize text content
 */
function cleanText(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
}

/**
 * Extract main content from HTML using heuristics
 */
function extractMainContent($: cheerio.CheerioAPI): string {
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, .advertisement, .ad, .sidebar, .menu, .navigation').remove();

    // Try to find main content area
    const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '.main-content',
        '.post-content',
        '.article-content',
        '.entry-content',
        '#content',
        '#main',
    ];

    for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim().length > 200) {
            return cleanText(element.text());
        }
    }

    // Fallback: extract from body
    const bodyText = $('body').text();
    return cleanText(bodyText);
}

/**
 * Extract metadata from HTML
 */
function extractMetadata($: cheerio.CheerioAPI): ScrapedContent['metadata'] {
    const metadata: ScrapedContent['metadata'] = {};

    // Open Graph metadata
    metadata.siteName = $('meta[property="og:site_name"]').attr('content');
    metadata.author = $('meta[name="author"]').attr('content') || 
                     $('meta[property="article:author"]').attr('content');
    metadata.publishDate = $('meta[property="article:published_time"]').attr('content') ||
                          $('meta[name="publish_date"]').attr('content');
    
    // Keywords
    const keywordsStr = $('meta[name="keywords"]').attr('content');
    if (keywordsStr) {
        metadata.keywords = keywordsStr.split(',').map(k => k.trim());
    }

    return metadata;
}

/**
 * Extract images from HTML
 */
function extractImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = [];
    
    $('img').each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
            try {
                const absoluteUrl = new URL(src, baseUrl).href;
                images.push(absoluteUrl);
            } catch {
                // Invalid URL, skip
            }
        }
    });

    return images.slice(0, 10); // Limit to 10 images
}

/**
 * Extract links from HTML
 */
function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            try {
                const absoluteUrl = new URL(href, baseUrl).href;
                if (absoluteUrl.startsWith('http')) {
                    links.push(absoluteUrl);
                }
            } catch {
                // Invalid URL, skip
            }
        }
    });

    // Remove duplicates
    return [...new Set(links)].slice(0, 20); // Limit to 20 links
}

/**
 * Scrape a single URL and extract content
 */
export async function scrapeUrl(url: string, options: ScraperOptions = {}): Promise<ScrapedContent> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    try {
        console.log(`🌐 Scraping: ${url}`);

        // Fetch the page
        const response = await axios.get(url, {
            timeout: opts.timeout,
            maxContentLength: opts.maxContentLength,
            headers: {
                'User-Agent': opts.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
            },
            validateStatus: (status) => status >= 200 && status < 300,
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract basic information
        const title = $('title').text() || 
                     $('meta[property="og:title"]').attr('content') || 
                     $('h1').first().text() || 
                     'Untitled';

        const description = $('meta[name="description"]').attr('content') ||
                           $('meta[property="og:description"]').attr('content') ||
                           '';

        // Extract main content
        const content = extractMainContent($);

        // Extract metadata
        const metadata = extractMetadata($);

        // Extract images and links if requested
        const images = opts.extractImages ? extractImages($, url) : [];
        const links = opts.extractLinks ? extractLinks($, url) : [];

        console.log(`✅ Scraped successfully: ${title.substring(0, 50)}...`);

        return {
            title: cleanText(title),
            description: cleanText(description),
            content: content.substring(0, opts.maxContentLength || 50000),
            url,
            images,
            links,
            metadata,
        };

    } catch (error) {
        console.error(`❌ Scraping failed for ${url}:`, error);
        
        return {
            title: 'Error',
            description: '',
            content: '',
            url,
            images: [],
            links: [],
            metadata: {},
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Scrape multiple URLs in parallel
 */
export async function scrapeUrls(
    urls: string[],
    options: ScraperOptions = {}
): Promise<ScrapedContent[]> {
    console.log(`🌐 Scraping ${urls.length} URLs...`);
    
    const promises = urls.map(url => scrapeUrl(url, options));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            return {
                title: 'Error',
                description: '',
                content: '',
                url: urls[index],
                images: [],
                links: [],
                metadata: {},
                error: result.reason?.message || 'Scraping failed',
            };
        }
    });
}

/**
 * Extract readable content using advanced content extraction
 * This is a simplified version without JSDOM for browser compatibility
 */
export async function extractReadableContent(url: string): Promise<ScrapedContent> {
    // Simply use the regular scraper with enhanced content detection
    return scrapeUrl(url, {
        timeout: 10000,
        maxContentLength: 50000,
    });
}

/**
 * Smart content extraction - tries multiple methods
 */
export async function smartScrape(url: string): Promise<ScrapedContent> {
    try {
        // Try readability first (best for articles)
        const readable = await extractReadableContent(url);
        
        // If we got good content, return it
        if (readable.content.length > 500 && !readable.error) {
            return readable;
        }

        // Otherwise, fallback to regular scraping
        return scrapeUrl(url);
        
    } catch (error) {
        // Final fallback
        return scrapeUrl(url);
    }
}

/**
 * Summarize scraped content for AI context
 */
export function summarizeScrapedContent(scraped: ScrapedContent, maxLength: number = 2000): string {
    if (scraped.error) {
        return `Error scraping ${scraped.url}: ${scraped.error}`;
    }

    let summary = `**${scraped.title}**\n`;
    summary += `Source: ${scraped.url}\n\n`;

    if (scraped.description) {
        summary += `${scraped.description}\n\n`;
    }

    // Add content preview
    const contentPreview = scraped.content.substring(0, maxLength);
    summary += contentPreview;

    if (scraped.content.length > maxLength) {
        summary += '... [Content truncated]';
    }

    return summary;
}
