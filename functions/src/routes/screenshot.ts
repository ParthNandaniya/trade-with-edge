import { Router, Request, Response } from 'express';
import { Browser, Page } from 'puppeteer-core';
import { ScreenshotStep, ScreenshotStepResult, ScreenshotResponse, AlphaVantageData } from './screenshot/types';
import { finvizStep, tradingviewStep, tradingviewStep2 } from './screenshot/steps';
import { config } from '../config.js';
import { launchBrowser as launchBrowserWithConfig } from '../puppeteer-config.js';

export const screenshotRouter = Router();

// Viewport configuration
const VIEWPORT_WIDTH = 2560;
const VIEWPORT_HEIGHT = 1440;
const DEVICE_SCALE_FACTOR = 2;

// List of all screenshot steps to execute
const SCREENSHOT_STEPS: ScreenshotStep[] = [
  finvizStep,
  tradingviewStep,      // First TradingView screenshot (variant: 'default')
  tradingviewStep2,     // Second TradingView screenshot (variant: 'secondary')
  // Add more steps here as you create them
  // Example: anotherWebsiteStep,
];

/**
 * Setup browser page with common configuration
 */
async function setupPage(page: Page): Promise<void> {
  page.setDefaultTimeout(60000); // Increased to 60 seconds
  page.setDefaultNavigationTimeout(120000); // Increased to 2 minutes for slow-loading sites like TradingView
  
  await page.setViewport({ 
    width: VIEWPORT_WIDTH, 
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR
  });

  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  await page.evaluateOnNewDocument(() => {
    // @ts-ignore
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });
}

/**
 * Launch browser with common configuration
 * Uses Firebase Functions optimized Puppeteer config
 */
async function launchBrowser(): Promise<Browser> {
  return await launchBrowserWithConfig();
    protocolTimeout: 180000 // 3 minutes for protocol operations
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!browser.isConnected()) {
    throw new Error('Browser connection lost after launch');
  }
  
  return browser;
}

/**
 * Utility function to delay execution (for rate limiting)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Transform Alpha Vantage time series data:
 * - Remove numeric prefixes (1., 2., 3., etc.) from keys in Time Series objects
 * - Calculate and add VWAP for each day
 */
function transformTimeSeriesData(data: any): any {
  if (!data || !data['Time Series (Daily)']) {
    return data;
  }

  const transformedData = { ...data };
  const timeSeries = data['Time Series (Daily)'];
  const transformedTimeSeries: any = {};

  // Process each date in the time series
  for (const date in timeSeries) {
    const dayData = timeSeries[date];
    const transformedDayData: any = {};

    // Remove numeric prefixes and transform keys
    for (const key in dayData) {
      // Remove "1. ", "2. ", "3. ", "4. ", "5. " prefixes
      const cleanKey = key.replace(/^\d+\.\s*/, '').toLowerCase();
      transformedDayData[cleanKey] = dayData[key];
    }

    // Calculate VWAP: (High + Low + Close) / 3
    const high = parseFloat(transformedDayData.high || '0');
    const low = parseFloat(transformedDayData.low || '0');
    const close = parseFloat(transformedDayData.close || '0');
    
    if (high && low && close) {
      transformedDayData.vwap = ((high + low + close) / 3).toFixed(4);
    }

    transformedTimeSeries[date] = transformedDayData;
  }

  transformedData['Time Series (Daily)'] = transformedTimeSeries;
  return transformedData;
}

/**
 * Fetch Alpha Vantage time series data for a ticker
 */
async function fetchAlphaVantageTimeSeries(ticker: string, apiKey: string = 'demo'): Promise<any> {
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker.toUpperCase()}&apikey=${apiKey}`;
    
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

    // Transform the data: remove numeric prefixes and add VWAP
    return transformTimeSeriesData(data);
  } catch (error: any) {
    console.error('Error fetching Alpha Vantage time series data:', error);
    throw error;
  }
}

/**
 * Fetch Alpha Vantage news sentiment data for a ticker
 */
async function fetchAlphaVantageNewsSentiment(ticker: string, apiKey: string = 'demo', limit: number = 10): Promise<any> {
  try {
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${ticker.toUpperCase()}&limit=${limit}&apikey=${apiKey}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'trade-with-edge-server'
      }
    });

    if (!response.ok) {
      throw new Error(`Alpha Vantage News API returned status ${response.status}`);
    }

    const data = await response.json() as any;
    
    // Check for API error messages
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    if (data['Note']) {
      throw new Error(data['Note']); // API call frequency limit
    }

    return data;
  } catch (error: any) {
    console.error('Error fetching Alpha Vantage news sentiment data:', error);
    throw error;
  }
}

/**
 * Fetch all Alpha Vantage data (time series + news sentiment)
 */
async function fetchAlphaVantageData(ticker: string, apiKey: string = 'demo'): Promise<any> {
  const [timeSeriesData, newsData] = await Promise.allSettled([
    fetchAlphaVantageTimeSeries(ticker, apiKey),
    fetchAlphaVantageNewsSentiment(ticker, apiKey, 10)
  ]);

  return {
    timeSeries: timeSeriesData.status === 'fulfilled' ? timeSeriesData.value : null,
    timeSeriesError: timeSeriesData.status === 'rejected' ? timeSeriesData.reason?.message : null,
    newsSentiment: newsData.status === 'fulfilled' ? newsData.value : null,
    newsSentimentError: newsData.status === 'rejected' ? newsData.reason?.message : null
  };
}

/**
 * Execute all screenshot steps sequentially
 */
async function executeScreenshotSteps(
  browser: Browser, 
  ticker: string, 
  sendEvent?: (event: string, data: any) => void
): Promise<ScreenshotStepResult[]> {
  const results: ScreenshotStepResult[] = [];
  const page = await browser.newPage();
  
  try {
    await setupPage(page);
    
    // Execute each screenshot step
    for (const step of SCREENSHOT_STEPS) {
      if (sendEvent) {
        sendEvent('status', {
          message: `Starting ${step.name} screenshot...`,
          step: `${step.name}_start`,
          website: step.name
        });
      }
      
      const result = await step.execute(browser, page, ticker, sendEvent);
      results.push(result);
      
      if (sendEvent) {
        sendEvent('status', {
          message: `${step.name} screenshot ${result.success ? 'completed' : 'failed'}`,
          step: `${step.name}_${result.success ? 'complete' : 'failed'}`,
          website: step.name,
          success: result.success
        });
      }
      
      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } finally {
    await page.close();
  }
  
  return results;
}

// GET endpoint for stock screenshots from all websites
screenshotRouter.get('/', async (req: Request, res: Response) => {
  try {
    const ticker = req.query.ticker as string;

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker symbol is required. Use ?ticker=SYMBOL' });
    }

    console.log(`📸 Taking screenshots for ticker: ${ticker.toUpperCase()}`);

    let browser: Browser | null = null;
    try {
      browser = await launchBrowser();
      console.log('✅ Browser launched successfully');

      const results = await executeScreenshotSteps(browser, ticker);
      
      await browser.close();

      // Fetch Alpha Vantage data after screenshots are taken
      const alphaVantageData: AlphaVantageData = {};
      
      // Fetch news sentiment data
      try {
        console.log(`📊 Fetching Alpha Vantage news sentiment for ${ticker.toUpperCase()}...`);
        const newsData = await fetchAlphaVantageNewsSentiment(ticker, config.alphaVantage.apiKey, 10);
        alphaVantageData.news = {
          success: true,
          data: newsData
        };
        console.log('✅ Alpha Vantage news sentiment fetched successfully');
      } catch (newsError: any) {
        console.error('❌ Failed to fetch Alpha Vantage news data:', newsError.message);
        alphaVantageData.news = {
          success: false,
          error: newsError.message || 'Failed to fetch Alpha Vantage news data'
        };
      }
      
      // Wait 1 second before next API call to respect rate limits
      console.log('⏳ Waiting 1 second before next Alpha Vantage API call...');
      await delay(1000);
      
      // Fetch trading (time series) data
      try {
        console.log(`📊 Fetching Alpha Vantage time series for ${ticker.toUpperCase()}...`);
        const timeSeriesData = await fetchAlphaVantageTimeSeries(ticker, config.alphaVantage.apiKey);
        alphaVantageData.trading = {
          success: true,
          data: timeSeriesData
        };
        console.log('✅ Alpha Vantage time series fetched successfully');
      } catch (tradingError: any) {
        console.error('❌ Failed to fetch Alpha Vantage trading data:', tradingError.message);
        alphaVantageData.trading = {
          success: false,
          error: tradingError.message || 'Failed to fetch Alpha Vantage trading data'
        };
      }

      const response: ScreenshotResponse = {
        success: results.every(r => r.success),
        ticker: ticker.toUpperCase(),
        screenshots: results,
        alphaVantage: alphaVantageData,
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error: any) {
      console.error('Error taking screenshots:', error);
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
      res.status(500).json({
        error: 'Failed to take screenshots',
        message: error.message || 'An error occurred while taking the screenshots'
      });
    }

  } catch (error: any) {
    console.error('Error in screenshot endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// SSE endpoint for streaming screenshot process with live updates
screenshotRouter.get('/stream', async (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const ticker = req.query.ticker as string;

    if (!ticker) {
      sendEvent('error', { error: 'Ticker symbol is required. Use ?ticker=SYMBOL' });
      res.end();
      return;
    }

    sendEvent('status', { 
      message: 'Starting screenshot process...', 
      step: 'init',
      ticker: ticker.toUpperCase()
    });

    let browser: Browser | null = null;
    try {
      sendEvent('status', { message: 'Launching browser...', step: 'browser_launch' });
      browser = await launchBrowser();
      sendEvent('status', { message: 'Browser launched successfully', step: 'browser_ready' });

      const results = await executeScreenshotSteps(browser, ticker, sendEvent);
      
      await browser.close();

      // Fetch Alpha Vantage data after screenshots are taken
      const alphaVantageData: AlphaVantageData = {};
      
      // Fetch news sentiment data
      try {
        sendEvent('status', { 
          message: 'Fetching Alpha Vantage news sentiment...', 
          step: 'alpha_vantage_news_fetch' 
        });
        const newsData = await fetchAlphaVantageNewsSentiment(ticker, config.alphaVantage.apiKey, 10);
        
        alphaVantageData.news = {
          success: true,
          data: newsData
        };
        
        sendEvent('status', { 
          message: 'Alpha Vantage news sentiment data fetched successfully', 
          step: 'alpha_vantage_news_complete' 
        });
      } catch (newsError: any) {
        sendEvent('status', { 
          message: `Failed to fetch Alpha Vantage news data: ${newsError.message}`, 
          step: 'alpha_vantage_news_error' 
        });
        alphaVantageData.news = {
          success: false,
          error: newsError.message || 'Failed to fetch Alpha Vantage news data'
        };
      }
      
      // Wait 1 second before next API call to respect rate limits
      sendEvent('status', { 
        message: 'Waiting 1 second before next API call (rate limit)...', 
        step: 'alpha_vantage_rate_limit_delay' 
      });
      await delay(1000);
      
      // Fetch trading (time series) data
      try {
        sendEvent('status', { 
          message: 'Fetching Alpha Vantage time series...', 
          step: 'alpha_vantage_trading_fetch' 
        });
        const timeSeriesData = await fetchAlphaVantageTimeSeries(ticker, config.alphaVantage.apiKey);
        
        alphaVantageData.trading = {
          success: true,
          data: timeSeriesData
        };
        
        sendEvent('status', { 
          message: 'Alpha Vantage time series data fetched successfully', 
          step: 'alpha_vantage_trading_complete' 
        });
      } catch (tradingError: any) {
        sendEvent('status', { 
          message: `Failed to fetch Alpha Vantage trading data: ${tradingError.message}`, 
          step: 'alpha_vantage_trading_error' 
        });
        alphaVantageData.trading = {
          success: false,
          error: tradingError.message || 'Failed to fetch Alpha Vantage trading data'
        };
      }

      // Send final result with all screenshots and Alpha Vantage data
      sendEvent('complete', {
        success: results.every(r => r.success),
        ticker: ticker.toUpperCase(),
        screenshots: results,
        alphaVantage: alphaVantageData,
        timestamp: new Date().toISOString()
      });

      res.end();

    } catch (error: any) {
      sendEvent('error', { 
        error: 'Failed to take screenshots', 
        message: error.message || 'An error occurred while taking the screenshots' 
      });
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          // Ignore
        }
      }
      res.end();
    }

  } catch (error: any) {
    sendEvent('error', { 
      error: 'Internal server error', 
      message: error.message || 'An unexpected error occurred' 
    });
    res.end();
  }
});

// POST endpoint for custom screenshots (kept for backward compatibility)
screenshotRouter.post('/', async (req: Request, res: Response) => {
  res.status(501).json({
    error: 'POST endpoint not implemented',
    message: 'Please use GET /api/screenshot?ticker=SYMBOL for stock screenshots'
  });
});
