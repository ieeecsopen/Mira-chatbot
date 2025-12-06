# Web Scraping Feature

## Overview

The Mira chatbot now includes advanced web scraping capabilities that enhance web search results by extracting and analyzing the actual content of web pages.

## Features

### 🌐 Intelligent Content Extraction
- Automatically scrapes the top 3 search results
- Extracts main content using multiple heuristics
- Removes navigation, ads, and other non-content elements
- Supports both Cheerio (fast) and JSDOM (accurate) parsing

### 📄 Content Analysis
- **Title Extraction**: Gets page title from multiple sources
- **Meta Description**: Extracts page descriptions
- **Main Content**: Identifies and extracts article/main content
- **Metadata**: Author, publish date, keywords, site name
- **Images**: Extracts image URLs (optional)
- **Links**: Extracts internal and external links (optional)

### 🚀 Performance Optimized
- Parallel scraping of multiple URLs
- Configurable timeouts (default: 10s)
- Content length limits to prevent memory issues
- Error handling with graceful fallbacks

## Usage

### Basic Web Search with Scraping

The scraping happens automatically when you perform a web search:

```typescript
import { webSearch } from './lib/webSearch';

const results = await webSearch('latest AI news');
// Results now include scrapedContent and fullContent fields
```

### Search Results Structure

```typescript
interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source: string;
    favicon?: string;
    publishedDate?: string;
    scrapedContent?: ScrapedContent;  // NEW: Full scraped content
    fullContent?: string;              // NEW: Cleaned text content
}
```

### Direct URL Scraping

Scrape a specific URL directly:

```typescript
import { scrapeSingleUrl } from './lib/webSearch';

const content = await scrapeSingleUrl('https://example.com/article');
console.log(content.title);
console.log(content.content);
```

### Advanced Scraping Options

```typescript
import { scrapeUrl } from './lib/webScraper';

const content = await scrapeUrl('https://example.com', {
    timeout: 15000,           // 15 second timeout
    maxContentLength: 100000, // 100KB max content
    extractImages: true,      // Extract image URLs
    extractLinks: true,       // Extract page links
    userAgent: 'CustomBot/1.0' // Custom user agent
});
```

### Enable/Disable Scraping

```typescript
import { setScrapingEnabled, isScrapingEnabled } from './lib/webSearch';

// Disable scraping for faster searches
setScrapingEnabled(false);

// Check status
console.log(isScrapingEnabled()); // false

// Re-enable
setScrapingEnabled(true);
```

## Configuration

Edit `src/lib/webSearch.ts` to modify scraping settings:

```typescript
const SEARCH_CONFIG = {
    maxResults: 5,           // Max search results
    timeout: 8000,           // Search timeout (ms)
    minRelevanceScore: 0.3,  // Relevance threshold
    enableScraping: true,    // Enable/disable scraping
    maxScrapedResults: 3,    // How many results to scrape
};
```

## How It Works

### 1. Search Phase
- Queries multiple search providers (SearXNG, DuckDuckGo, Proxy)
- Returns initial results with titles and snippets

### 2. Scraping Phase (if enabled)
- Takes top N results (default: 3)
- Scrapes each URL in parallel
- Extracts main content using multiple strategies:
  - Looks for `<article>`, `<main>`, or content-related elements
  - Falls back to body content if specific elements not found
  - Removes scripts, styles, navigation, ads, etc.

### 3. Enhancement Phase
- Attaches scraped content to search results
- Enhances short snippets with actual page content
- Preserves metadata for citation purposes

### 4. AI Context Generation
- Formats results with full content for AI
- Includes up to 1500 characters per result
- Adds metadata (author, publish date) when available

## Benefits

### For Users
- **More Accurate Answers**: AI gets full context, not just snippets
- **Better Citations**: Real content leads to better source references
- **Deeper Analysis**: AI can analyze actual article content

### For Developers
- **Flexible**: Easy to enable/disable scraping
- **Extensible**: Add custom scraping strategies
- **Robust**: Multiple fallback mechanisms

## Error Handling

The scraper includes comprehensive error handling:

```typescript
// If a page fails to scrape
{
    title: 'Error',
    description: '',
    content: '',
    url: 'https://failed-url.com',
    error: 'Connection timeout',
    // ... other fields empty
}
```

Failed scrapes don't break the search - the original snippet is used instead.

## Performance Tips

1. **Adjust maxScrapedResults**: Lower for faster searches (1-2)
2. **Set lower timeouts**: Faster but might miss slow sites
3. **Disable for simple queries**: Use `setScrapingEnabled(false)`
4. **Limit content length**: Reduces memory usage

## Dependencies

- **axios**: HTTP client for fetching pages
- **cheerio**: Fast HTML parsing (like jQuery for Node.js)
- **jsdom**: Full DOM implementation for complex pages

## Examples

### Example 1: Search with Scraping
```typescript
const results = await webSearch('climate change solutions');
results.results.forEach((result, i) => {
    console.log(`[${i+1}] ${result.title}`);
    if (result.fullContent) {
        console.log(`   Content preview: ${result.fullContent.substring(0, 200)}...`);
    }
});
```

### Example 2: Scrape Article
```typescript
const article = await scrapeSingleUrl('https://example.com/article');
console.log(`Title: ${article.title}`);
console.log(`Author: ${article.metadata.author}`);
console.log(`Published: ${article.metadata.publishDate}`);
console.log(`Content: ${article.content}`);
```

### Example 3: Conditional Scraping
```typescript
// Only scrape if query needs detailed content
const needsDetail = query.includes('explain') || query.includes('how does');
setScrapingEnabled(needsDetail);

const results = await webSearch(query);
```

## Troubleshooting

### Issue: Scraping is slow
**Solution**: Reduce `maxScrapedResults` or decrease timeout

### Issue: Content quality is poor
**Solution**: The scraper uses heuristics to find main content. Some sites may need custom selectors.

### Issue: Some sites fail to scrape
**Solution**: This is normal. Sites may block scrapers or have unusual structures. The search still returns the basic snippet.

### Issue: Memory usage is high
**Solution**: Lower `maxContentLength` in scraper options

## Future Enhancements

Potential improvements:
- [ ] Custom scraping rules per domain
- [ ] JavaScript rendering for dynamic sites
- [ ] PDF content extraction
- [ ] Image OCR for text in images
- [ ] Caching of scraped content
- [ ] Rate limiting per domain
- [ ] Sitemap analysis

## Security & Ethics

- Respects robots.txt (should be added)
- Uses reasonable timeouts
- Includes proper User-Agent
- Doesn't overload servers (parallel but limited)
- Should add rate limiting for production use

## License

Part of the Mira Chatbot project.
