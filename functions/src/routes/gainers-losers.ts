import { Router, Request, Response } from 'express';
import { config } from '../config.js';

interface StockData {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string;
  volume: string;
}

interface GainersLosersResponse {
  metadata: string;
  last_updated: string;
  top_gainers: StockData[];
  top_losers: StockData[];
  most_actively_traded: StockData[];
}

export const gainersLosersRouter = Router();

/**
 * Get top gainers, losers, and most actively traded stocks of the day
 * Uses Alpha Vantage TOP_GAINERS_LOSERS API
 */
gainersLosersRouter.get('/', async (req: Request, res: Response) => {
  try {
    const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${config.alphaVantage.apiKey}`;

    console.log('📈 Fetching top gainers and losers...');

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

    // Transform the data to match our interface
    const result: GainersLosersResponse = {
      metadata: data.metadata || 'Top gainers, losers, and most actively traded US tickers',
      last_updated: data.last_updated || '',
      top_gainers: data.top_gainers || [],
      top_losers: data.top_losers || [],
      most_actively_traded: data.most_actively_traded || []
    };

    console.log(`✅ Fetched ${result.top_gainers.length} gainers, ${result.top_losers.length} losers, ${result.most_actively_traded.length} most active`);

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Error fetching gainers and losers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gainers and losers',
      message: error.message || 'An error occurred while fetching market data'
    });
  }
});

