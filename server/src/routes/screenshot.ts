import { Router, Request, Response } from 'express';
import puppeteer, { Browser, Page } from 'puppeteer';
import { ScreenshotStep, ScreenshotStepResult, ScreenshotResponse } from './screenshot/types';
import { finvizStep, tradingviewStep, tradingviewStep2 } from './screenshot/steps';

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
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  
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
 */
async function launchBrowser(): Promise<Browser> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080'
    ],
    timeout: 30000,
    protocolTimeout: 60000
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (!browser.isConnected()) {
    throw new Error('Browser connection lost after launch');
  }
  
  return browser;
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

      const response: ScreenshotResponse = {
        success: results.every(r => r.success),
        ticker: ticker.toUpperCase(),
        screenshots: results,
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

      // Send final result with all screenshots
      sendEvent('complete', {
        success: results.every(r => r.success),
        ticker: ticker.toUpperCase(),
        screenshots: results,
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
