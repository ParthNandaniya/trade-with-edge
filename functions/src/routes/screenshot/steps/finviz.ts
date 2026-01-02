import { Page, Browser, ElementHandle } from 'puppeteer';
import { ScreenshotStep, ScreenshotStepResult } from '../types';

const FINVIZ_BASE_URL = 'https://finviz.com/quote.ashx';
const FINVIZ_SELECTOR = '.screener_snapshot-table-wrapper';

export const finvizStep: ScreenshotStep = {
  name: 'finviz',
  execute: async (browser: Browser, page: Page, ticker: string, sendEvent?: (event: string, data: any) => void): Promise<ScreenshotStepResult> => {
    const url = `${FINVIZ_BASE_URL}?t=${ticker.toUpperCase()}`;
    
    const log = (message: string, step?: string) => {
      console.log(`[Finviz] ${message}`);
      if (sendEvent) {
        sendEvent('status', { 
          message: `[Finviz] ${message}`, 
          step: step || 'finviz_step',
          website: 'finviz',
          url: url 
        });
      }
    };

    try {
      log(`Navigating to ${url}...`, 'finviz_navigating');
      
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      const currentUrl = page.url();
      log(`Page loaded at ${currentUrl}`, 'finviz_page_loaded');

      // Check if we're on Cloudflare challenge page
      const isCloudflareChallenge = await page.evaluate(() => {
        // @ts-ignore
        const bodyText = document.body ? document.body.innerText : '';
        // @ts-ignore
        return bodyText.includes('Verifying you are human') || 
               bodyText.includes('Just a moment');
      });

      if (isCloudflareChallenge) {
        log('Cloudflare challenge detected. Waiting for verification...', 'finviz_cloudflare_challenge');
        
        try {
          await page.waitForSelector('#challenge-success-text, .challenge-success-text', {
            timeout: 30000
          });
          log('Cloudflare verification successful', 'finviz_cloudflare_verified');
          
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
        log('Still on Cloudflare challenge, waiting longer...', 'finviz_cloudflare_waiting');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        try {
          await page.waitForSelector('table', { timeout: 10000 });
          log('Page loaded - past Cloudflare challenge', 'finviz_cloudflare_complete');
        } catch (e) {
          // Continue
        }
      }

      const finalUrl = page.url();
      
      if (!finalUrl.includes(`t=${ticker.toUpperCase()}`) && !finalUrl.includes('finviz.com/quote')) {
        const error = `Ticker symbol "${ticker.toUpperCase()}" was not found on Finviz.`;
        log(error, 'finviz_error');
        return {
          name: 'finviz',
          success: false,
          url: url,
          error: error,
          timestamp: new Date().toISOString()
        };
      }

      log('Page loaded successfully', 'finviz_page_ready');

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for the target element
      log(`Waiting for element with selector: ${FINVIZ_SELECTOR}`, 'finviz_finding_element');
      let element: ElementHandle | null = null;
      let foundSelector = FINVIZ_SELECTOR;

      try {
        await page.waitForSelector(FINVIZ_SELECTOR, {
          timeout: 3000
        });
        element = await page.$(FINVIZ_SELECTOR);
        if (element) {
          log(`Found element with selector: ${FINVIZ_SELECTOR}`, 'finviz_element_found');
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
              log(`Found element with fallback selector: ${selector}`, 'finviz_element_found');
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!element || !foundSelector) {
        const error = 'Could not find any matching selector';
        log(error, 'finviz_error');
        return {
          name: 'finviz',
          success: false,
          url: url,
          error: error,
          timestamp: new Date().toISOString()
        };
      }

      // Take screenshot
      log('Taking screenshot...', 'finviz_taking_screenshot');
      const screenshot = (await element.screenshot({
        type: 'png'
      })) as Buffer;
      
      log('Screenshot taken successfully', 'finviz_screenshot_complete');

      const base64Screenshot = screenshot.toString('base64');
      
      return {
        name: 'finviz',
        success: true,
        image: `data:image/png;base64,${base64Screenshot}`,
        url: url,
        selector: foundSelector,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred while taking the screenshot';
      log(`Error: ${errorMessage}`, 'finviz_error');
      return {
        name: 'finviz',
        success: false,
        url: url,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }
};

