import { Router, Request, Response } from 'express';
import puppeteer from 'puppeteer';

export const screenshotRouter = Router();

// Finviz configuration
const FINVIZ_BASE_URL = 'https://finviz.com/quote.ashx';
const FINVIZ_SELECTOR = '.screener_snapshot-table-wrapper'; // Snapshot table wrapper containing all stock data
const VIEWPORT_WIDTH = 2560; // Increased for higher resolution
const VIEWPORT_HEIGHT = 1440; // Increased for higher resolution
const DEVICE_SCALE_FACTOR = 2; // 2x for retina/high DPI screenshots

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

    // Launch browser with macOS-compatible configuration
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled', // Hide automation
          '--disable-features=IsolateOrigins,site-per-process',
          '--window-size=1920,1080'
        ],
        timeout: 30000,
        protocolTimeout: 60000
      });
      
      // Wait a bit to ensure browser is fully initialized
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify browser is connected
      if (!browser.isConnected()) {
        throw new Error('Browser connection lost after launch');
      }
    } catch (browserError: any) {
      console.error('Failed to launch browser:', browserError);
      return res.status(500).json({
        error: 'Failed to launch browser',
        message: 'Could not start browser instance. Please try again.'
      });
    }

    try {
      const page = await browser.newPage();
      
      // Set default timeouts for page operations
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(60000); // Increased for Cloudflare
      
      // Set viewport size with high DPI for better quality
      await page.setViewport({ 
        width: VIEWPORT_WIDTH, 
        height: VIEWPORT_HEIGHT,
        deviceScaleFactor: DEVICE_SCALE_FACTOR // 2x resolution for high-quality screenshots
      });

      // Make browser look more human-like
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Remove webdriver property
      await page.evaluateOnNewDocument(() => {
        // @ts-ignore
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
      });

      // Navigate to Finviz URL
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000 // 60 seconds for Cloudflare
      });

      // Check if we're on Cloudflare challenge page
      const isCloudflareChallenge = await page.evaluate(() => {
        // @ts-ignore
        const bodyText = document.body ? document.body.innerText : '';
        // @ts-ignore
        return bodyText.includes('Verifying you are human') || 
               bodyText.includes('Just a moment');
      });

      if (isCloudflareChallenge) {
        console.log(`🛡️  Cloudflare challenge detected. Waiting for verification...`);
        
        // Wait for verification success message
        try {
          await page.waitForSelector('#challenge-success-text, .challenge-success-text', {
            timeout: 30000 // Wait up to 30 seconds for verification
          });
          console.log(`✅ Cloudflare verification successful`);
          
          // Wait a bit for redirect
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Wait for navigation to complete after verification
          await page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 30000
          }).catch(() => {
            // Navigation may not always happen, continue anyway
          });
        } catch (challengeError) {
          // Wait a bit more and continue
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Check if we're still on Cloudflare challenge page and wait if needed
      const stillOnChallenge = await page.evaluate(() => {
        // @ts-ignore
        const bodyText = document.body ? document.body.innerText : '';
        // @ts-ignore
        return bodyText.includes('Verifying you are human') || 
               bodyText.includes('Just a moment') ||
               bodyText.includes('challenge');
      });

      if (stillOnChallenge) {
        console.log(`⏳ Still on Cloudflare challenge, waiting for completion...`);
        // Wait up to 15 more seconds for Cloudflare to complete
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // Try waiting for any table to appear (indicates we're past challenge)
        try {
          await page.waitForSelector('table', { timeout: 10000 });
          console.log(`✅ Page loaded - past Cloudflare challenge`);
        } catch (e) {
          // Continue anyway
        }
      }

      // Final URL check
      const finalUrl = page.url();
      
      // If redirected to home page or quote page without ticker, ticker doesn't exist
      if (!finalUrl.includes(`t=${ticker.toUpperCase()}`) && !finalUrl.includes('finviz.com/quote')) {
        console.log(`❌ Page redirected to: ${finalUrl} - Ticker not found`);
        await browser.close();
        return res.status(404).json({
          error: 'Ticker symbol not found',
          message: `The ticker symbol "${ticker.toUpperCase()}" was not found on Finviz. Please check the symbol and try again.`,
          ticker: ticker.toUpperCase()
        });
      }

      console.log(`✅ Page loaded successfully at: ${finalUrl}`);

      // Wait a bit for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for the target element to appear
      console.log(`⏳ Waiting for element with selector: ${FINVIZ_SELECTOR}`);
      let element = null;
      let foundSelector = FINVIZ_SELECTOR;

      try {
        await page.waitForSelector(FINVIZ_SELECTOR, {
          timeout: 3000 // 3 seconds max
        });
        element = await page.$(FINVIZ_SELECTOR);
        if (element) {
          console.log(`✅ Found element with selector: ${FINVIZ_SELECTOR}`);
        }
      } catch (selectorError) {
        // Try fallback selectors if primary selector fails
        const alternativeSelectors = [
          'table.snapshot-table',
          'table.screener_snapshot-table',
          'table[class*="snapshot"]',
          'table'
        ];

        for (const selector of alternativeSelectors) {
          try {
            await page.waitForSelector(selector, {
              timeout: 3000 // 3 seconds max
            });
            element = await page.$(selector);
            if (element) {
              foundSelector = selector;
              console.log(`✅ Found element with fallback selector: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!element || !foundSelector) {
        console.error('Error: Could not find any matching selector');
        await browser.close();
        return res.status(404).json({
          error: 'Ticker symbol not found',
          message: `The ticker symbol "${ticker.toUpperCase()}" was not found on Finviz. Please check the symbol and try again.`,
          ticker: ticker.toUpperCase()
        });
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
        selector: foundSelector || FINVIZ_SELECTOR,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error taking screenshot:', error);
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
      res.status(500).json({
        error: 'Failed to take screenshot',
        message: error.message || 'An error occurred while taking the screenshot'
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

    // Validate ticker symbol
    if (!ticker) {
      sendEvent('error', { error: 'Ticker symbol is required. Use ?ticker=SYMBOL' });
      res.end();
      return;
    }

    // Construct Finviz URL
    const url = `${FINVIZ_BASE_URL}?t=${ticker.toUpperCase()}`;
    
    sendEvent('status', { 
      message: 'Starting screenshot process...', 
      step: 'init',
      url: url 
    });

    // Launch browser
    let browser;
    try {
      sendEvent('status', { message: 'Launching browser...', step: 'browser_launch' });
      browser = await puppeteer.launch({
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
      sendEvent('status', { message: 'Browser launched successfully', step: 'browser_ready' });
    } catch (browserError: any) {
      sendEvent('error', { error: 'Failed to launch browser', message: browserError.message });
      res.end();
      return;
    }

    try {
      const page = await browser.newPage();
      
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

      // Navigate to Finviz URL
      sendEvent('status', { message: `Navigating to ${url}...`, step: 'navigating', url: url });
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      const currentUrl = page.url();
      sendEvent('status', { message: `Page loaded at ${currentUrl}`, step: 'page_loaded', url: currentUrl });

      // Check if we're on Cloudflare challenge page
      const isCloudflareChallenge = await page.evaluate(() => {
        // @ts-ignore
        const bodyText = document.body ? document.body.innerText : '';
        // @ts-ignore
        return bodyText.includes('Verifying you are human') || 
               bodyText.includes('Just a moment');
      });

      if (isCloudflareChallenge) {
        sendEvent('status', { message: 'Cloudflare challenge detected. Waiting for verification...', step: 'cloudflare_challenge' });
        
        try {
          await page.waitForSelector('#challenge-success-text, .challenge-success-text', {
            timeout: 30000
          });
          sendEvent('status', { message: 'Cloudflare verification successful', step: 'cloudflare_verified' });
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          await page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 30000
          }).catch(() => {});
        } catch (challengeError) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Check if still on challenge
      const stillOnChallenge = await page.evaluate(() => {
        // @ts-ignore
        const bodyText = document.body ? document.body.innerText : '';
        // @ts-ignore
        return bodyText.includes('Verifying you are human') || 
               bodyText.includes('Just a moment') ||
               bodyText.includes('challenge');
      });

      if (stillOnChallenge) {
        sendEvent('status', { message: 'Still on Cloudflare challenge, waiting longer...', step: 'cloudflare_waiting' });
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        try {
          await page.waitForSelector('table', { timeout: 10000 });
          sendEvent('status', { message: 'Page loaded - past Cloudflare challenge', step: 'cloudflare_complete' });
        } catch (e) {
          // Continue
        }
      }

      const finalUrl = page.url();
      
      if (!finalUrl.includes(`t=${ticker.toUpperCase()}`) && !finalUrl.includes('finviz.com/quote')) {
        sendEvent('error', { error: 'Ticker symbol not found', message: `The ticker symbol "${ticker.toUpperCase()}" was not found on Finviz.` });
        await browser.close();
        res.end();
        return;
      }

      sendEvent('status', { message: 'Page loaded successfully', step: 'page_ready', url: finalUrl });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for the target element
      sendEvent('status', { message: `Waiting for element with selector: ${FINVIZ_SELECTOR}`, step: 'finding_element' });
      let element = null;
      let foundSelector = FINVIZ_SELECTOR;

      try {
        await page.waitForSelector(FINVIZ_SELECTOR, {
          timeout: 3000
        });
        element = await page.$(FINVIZ_SELECTOR);
        if (element) {
          sendEvent('status', { message: `Found element with selector: ${FINVIZ_SELECTOR}`, step: 'element_found' });
        }
      } catch (selectorError) {
        const alternativeSelectors = [
          'table.snapshot-table',
          'table.screener_snapshot-table',
          'table[class*="snapshot"]',
          'table'
        ];

        for (const selector of alternativeSelectors) {
          try {
            await page.waitForSelector(selector, {
              timeout: 3000
            });
            element = await page.$(selector);
            if (element) {
              foundSelector = selector;
              sendEvent('status', { message: `Found element with fallback selector: ${selector}`, step: 'element_found' });
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!element || !foundSelector) {
        sendEvent('error', { error: 'Could not find any matching selector', message: 'The ticker symbol was not found on Finviz.' });
        await browser.close();
        res.end();
        return;
      }

      // Take screenshot
      sendEvent('status', { message: 'Taking screenshot...', step: 'taking_screenshot' });
      const screenshot = (await element.screenshot({
        type: 'png'
      })) as Buffer;
      
      sendEvent('status', { message: 'Screenshot taken successfully', step: 'screenshot_complete' });

      await browser.close();

      const base64Screenshot = screenshot.toString('base64');
      
      // Send final result
      sendEvent('complete', {
        success: true,
        image: `data:image/png;base64,${base64Screenshot}`,
        ticker: ticker.toUpperCase(),
        url: url,
        selector: foundSelector || FINVIZ_SELECTOR,
        timestamp: new Date().toISOString()
      });

      res.end();

    } catch (error: any) {
      sendEvent('error', { error: 'Failed to take screenshot', message: error.message || 'An error occurred while taking the screenshot' });
      try {
        await browser.close();
      } catch (closeError) {
        // Ignore
      }
      res.end();
    }

  } catch (error: any) {
    sendEvent('error', { error: 'Internal server error', message: error.message || 'An unexpected error occurred' });
    res.end();
  }
});

// POST endpoint for custom screenshots (kept for backward compatibility)
screenshotRouter.post('/', async (req: Request, res: Response) => {
  res.status(501).json({
    error: 'POST endpoint not implemented',
    message: 'Please use GET /api/screenshot?ticker=SYMBOL for Finviz screenshots'
  });
});
