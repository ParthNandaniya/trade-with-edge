import { Page, Browser } from 'puppeteer';
import { ScreenshotStep, ScreenshotStepResult } from '../types';

const TRADINGVIEW_BASE_URL = 'https://www.tradingview.com/chart';

export const tradingviewStep: ScreenshotStep = {
  name: 'tradingview',
  execute: async (browser: Browser, page: Page, ticker: string, sendEvent?: (event: string, data: any) => void): Promise<ScreenshotStepResult> => {
    // URL format: https://www.tradingview.com/chart/?symbol=NASDAQ%3ARAIN
    const url = `${TRADINGVIEW_BASE_URL}/?symbol=NASDAQ%3A${ticker.toUpperCase()}`;
    
    const log = (message: string, step?: string) => {
      console.log(`[TradingView] ${message}`);
      if (sendEvent) {
        sendEvent('status', { 
          message: `[TradingView] ${message}`, 
          step: step || 'tradingview_step',
          website: 'tradingview',
          url: url 
        });
      }
    };

    try {
      log(`Navigating to ${url}...`, 'tradingview_navigating');
      
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      const currentUrl = page.url();
      log(`Page loaded at ${currentUrl}`, 'tradingview_page_loaded');

      // Wait for the specific layout areas to load
      log('Waiting for layout areas to load...', 'tradingview_waiting_layout');
      
      // Wait for both elements to appear
      try {
        await page.waitForSelector('.layout__area--top', {
          timeout: 30000
        });
        log('Top layout area found', 'tradingview_top_found');
        
        await page.waitForSelector('.layout__area--center', {
          timeout: 30000
        });
        log('Center layout area found', 'tradingview_center_found');
      } catch (selectorError) {
        log('Layout areas not found, waiting additional time...', 'tradingview_waiting');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Give extra time for content to fully render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get bounding boxes of both elements and calculate combined area
      log('Calculating combined bounding box...', 'tradingview_calculating_bounds');
      const bounds = await page.evaluate(() => {
        // @ts-ignore - Running in browser context
        const topElement = document.querySelector('.layout__area--top');
        // @ts-ignore - Running in browser context
        const centerElement = document.querySelector('.layout__area--center');
        
        if (!topElement || !centerElement) {
          return null;
        }

        const topRect = topElement.getBoundingClientRect();
        const centerRect = centerElement.getBoundingClientRect();
        
        // Calculate the combined bounding box
        // Take the smaller of the two right values because center chart is smaller than top header 
        // and we only want to take center chart and top ticker symbol
        const minX = Math.min(topRect.left, centerRect.left);
        const minY = Math.min(topRect.top, centerRect.top);
        const maxX = Math.min(topRect.right, centerRect.right); // Use min instead of max to match center chart width
        const maxY = Math.max(topRect.bottom, centerRect.bottom);
        
        return {
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(maxX - minX),
          height: Math.round(maxY - minY)
        };
      });

      if (!bounds) {
        throw new Error('Could not find layout areas (.layout__area--top and .layout__area--center)');
      }

      log(`Taking screenshot of combined area: ${bounds.width}x${bounds.height} at (${bounds.x}, ${bounds.y})`, 'tradingview_taking_screenshot');
      
      // Take screenshot of the combined area
      const screenshot = (await page.screenshot({
        type: 'png',
        clip: bounds
      })) as Buffer;
      
      log('Screenshot taken successfully', 'tradingview_screenshot_complete');

      const base64Screenshot = screenshot.toString('base64');
      
      return {
        name: 'tradingview',
        success: true,
        image: `data:image/png;base64,${base64Screenshot}`,
        url: url,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred while taking the screenshot';
      log(`Error: ${errorMessage}`, 'tradingview_error');
      return {
        name: 'tradingview',
        success: false,
        url: url,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }
};

