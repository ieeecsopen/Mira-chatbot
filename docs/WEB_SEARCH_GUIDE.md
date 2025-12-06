# Web Search Configuration Guide

## Overview

Mira chatbot includes powerful web search capabilities to provide real-time, up-to-date information. The system supports multiple search providers with automatic fallback for reliability.

## Search Providers

### 1. **Brave Search API** (Recommended)
- **Best for**: Real-time results, fresh content, time-sensitive queries
- **Cost**: FREE tier with 2,000 queries/month
- **Setup**: 
  1. Go to [Brave Search API](https://brave.com/search/api/)
  2. Sign up for a free account
  3. Get your API key
  4. Add to `.env`: `VITE_BRAVE_API_KEY=your_key_here`

### 2. **Serper API** (Google Alternative)
- **Best for**: High-quality results, Google-like search
- **Cost**: FREE tier with 2,500 queries
- **Setup**:
  1. Go to [Serper.dev](https://serper.dev)
  2. Sign up for free
  3. Get your API key
  4. Add to `.env`: `VITE_SERPER_API_KEY=your_key_here`

### 3. **SearXNG** (Free, No API Key)
- Privacy-focused meta-search engine
- Aggregates results from multiple sources
- Automatic fallback if API keys not configured

### 4. **DuckDuckGo** (Free, No API Key)
- Basic instant answers
- Works without authentication
- Limited to encyclopedic information

## Features

### Time-Sensitive Query Detection
The system automatically detects time-sensitive queries and prioritizes fresh results:
- **Keywords detected**: today, yesterday, now, current, latest, recent, news, price, weather, stock, etc.
- **Action**: Requests results from the past day/week instead of all-time results

### Result Ranking
Results are intelligently ranked based on:
1. **Relevance**: Keyword matching in title and snippet
2. **Freshness**: Recent results get higher scores for time-sensitive queries
3. **Source quality**: Trusted domains (Wikipedia, Reuters, BBC, etc.) get bonus points
4. **Position**: Minor positional bonus for tie-breaking

### Content Scraping
Top search results are automatically scraped to provide full content:
- Scrapes top 3 results by default
- Extracts main content, metadata, and context
- Enhanced snippets for better AI responses

## Usage

### In Chat
1. Enable web search by clicking the web search toggle button
2. Ask any question requiring current information:
   - "What's the weather in Colombo today?"
   - "Latest news about AI"
   - "Current Bitcoin price"
   - "Who won the match yesterday?"

### Auto-Detection
Certain query patterns automatically trigger web search:
- Questions starting with "search", "google", "find"
- "What's the latest..." 
- "Current price of..."
- "News about..."

## Configuration

### Environment Variables
```env
# Required
VITE_GEMINI_API_KEY=your_gemini_key

# Optional (for better search results)
VITE_BRAVE_API_KEY=your_brave_key
VITE_SERPER_API_KEY=your_serper_key
```

### Search Config (in code)
```typescript
const SEARCH_CONFIG = {
    maxResults: 10,           // Max results to return
    timeout: 10000,           // Request timeout (ms)
    enableScraping: true,     // Enable content scraping
    maxScrapedResults: 3,     // How many results to scrape
    preferRecent: true,       // Prefer recent results
};
```

## Troubleshooting

### No Search Results
1. Check if API keys are configured correctly
2. Verify API quotas haven't been exceeded
3. Check browser console for error messages
4. System will automatically fallback to free providers

### Outdated Results
1. Enable Brave Search or Serper API (paid providers are more current)
2. Use time-specific keywords in your query: "today", "latest", "current"
3. Check if query is detected as time-sensitive (look for "[Time-sensitive: true]" in console)

### Slow Searches
1. Reduce `maxScrapedResults` in configuration
2. Disable scraping: `setScrapingEnabled(false)`
3. Use faster search providers (Brave has best performance)

## Best Practices

1. **Use Paid APIs for Production**: Free providers are less reliable
2. **Monitor API Usage**: Keep track of your API quotas
3. **Enable for Specific Queries**: Don't enable web search for every query (costs API calls)
4. **Time-Specific Keywords**: Use "latest", "current", "today" for fresh results

## API Costs Comparison

| Provider | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| Brave Search | 2,000/month | $5/1000 queries | Real-time data |
| Serper | 2,500 total | $50/month | Google-quality |
| SearXNG | Unlimited | Free | Privacy |
| DuckDuckGo | Unlimited | Free | Basic queries |

## Example Queries

```
✅ Good for web search:
- "What's happening in Sri Lanka today?"
- "Latest AI news"
- "Bitcoin price now"
- "Weather in London"
- "Who won the election 2024?"

❌ Don't need web search:
- "Explain quantum physics"
- "How to code in Python"
- "What is recursion?"
- "Translate to Sinhala"
```

## Support

For issues or questions:
1. Check browser console for detailed logs
2. Verify API keys are valid
3. Test with different search providers
4. Review the search module: `src/lib/webSearch.ts`
