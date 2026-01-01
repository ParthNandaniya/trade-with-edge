import { Router, Request, Response } from 'express';
import puppeteer from 'puppeteer';

export const screenshotRouter = Router();

// Finviz configuration
const FINVIZ_BASE_URL = 'https://finviz.com/quote.ashx';
const FINVIZ_SELECTOR = 'table.snapshot-table2'; // Main snapshot table with stock data
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;

// GET endpoint for Finviz stock screenshot
screenshotRouter.get('/', async (req: Request, res: Response) => {
  try {
    const ticker = req.query.ticker as string;

    // Validate ticker symbol
    if (!ticker) {
      return res.status(400).json({ error: 'Ticker symbol is required. Use ?ticker=SYMBOL' });
    }

    // Construct Finviz URL
    const url = `${FINVIZ_BASE_URL}?t=${ticker.toUpperCase()}`;
    
    console.log(`📸 Taking screenshot of Finviz for ticker: ${ticker.toUpperCase()}`);
    console.log(`🔗 URL: ${url}`);
    console.log(`🎯 Selector: ${FINVIZ_SELECTOR}`);

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport size
      await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

      // Navigate to Finviz URL
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000 // 30 seconds timeout
      });

      // Wait for the selector to appear
      console.log(`⏳ Waiting for selector: ${FINVIZ_SELECTOR}`);
      await page.waitForSelector(FINVIZ_SELECTOR, {
        timeout: 10000
      });

      // Get the element
      const element = await page.$(FINVIZ_SELECTOR);
      if (!element) {
        throw new Error(`Element with selector "${FINVIZ_SELECTOR}" not found`);
      }

      // Take screenshot of the specific element
      const screenshot = (await element.screenshot({
        type: 'png'
      })) as Buffer;
      
      console.log(`✅ Screenshot taken successfully for ${ticker.toUpperCase()}`);

      await browser.close();

      // Return screenshot as base64 encoded string
      const base64Screenshot = screenshot.toString('base64');
      
      res.json({
        success: true,
        image: `data:image/png;base64,${base64Screenshot}`,
        ticker: ticker.toUpperCase(),
        url: url,
        selector: FINVIZ_SELECTOR,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      await browser.close();
      console.error('Error taking screenshot:', error);
      res.status(500).json({
        error: 'Failed to take screenshot',
        message: error.message
      });
    }

  } catch (error: any) {
    console.error('Error in screenshot endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST endpoint for custom screenshots (kept for backward compatibility)
screenshotRouter.post('/', async (req: Request, res: Response) => {
  res.status(501).json({
    error: 'POST endpoint not implemented',
    message: 'Please use GET /api/screenshot?ticker=SYMBOL for Finviz screenshots'
  });
});
