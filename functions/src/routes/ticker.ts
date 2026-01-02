import { Router, Request, Response } from 'express';
import { config } from '../config.js';

interface TickerSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: number;
}

export const tickerRouter = Router();

/**
 * Search for ticker symbols using Alpha Vantage SYMBOL_SEARCH API
 * Filters results to only show US stocks
 */
tickerRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const keywords = req.query.keywords as string;

    if (!keywords || keywords.trim() === '') {
      return res.status(400).json({ 
        error: 'Keywords are required. Use ?keywords=SYMBOL' 
      });
    }

    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords.trim())}&apikey=${config.alphaVantage.apiKey}`;

    console.log(`🔍 Searching for ticker: ${keywords}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'trade-with-edge-server'
      }
    });

    if (!response.ok) {
      throw new Error(`Alpha Vantage API returned status ${response.status}`);
    }

    const data = await response.json() as any;

    // Check for API error messages
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (data['Note']) {
      throw new Error(data['Note']); // API call frequency limit
    }

    // Filter to only US stocks
    const bestMatches = data.bestMatches || [];
    const usStocks = bestMatches.filter((match: any) => {
      const region = match['4. region'];
      return region === 'United States';
    });

    // Transform the data to a cleaner format
    const results = usStocks.map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      type: match['3. type'],
      region: match['4. region'],
      marketOpen: match['5. marketOpen'],
      marketClose: match['6. marketClose'],
      timezone: match['7. timezone'],
      currency: match['8. currency'],
      matchScore: parseFloat(match['9. matchScore'])
    }));

    // Sort by match score (highest first)
    results.sort((a: TickerSearchResult, b: TickerSearchResult) => b.matchScore - a.matchScore);

    console.log(`✅ Found ${results.length} US stock(s) for "${keywords}"`);

    res.json({
      success: true,
      keywords: keywords.trim(),
      count: results.length,
      results: results
    });

  } catch (error: any) {
    console.error('Error searching for ticker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search for ticker',
      message: error.message || 'An error occurred while searching for ticker'
    });
  }
});

