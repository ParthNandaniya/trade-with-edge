import { Page, Browser, ElementHandle } from 'puppeteer';
import { ScreenshotStep, ScreenshotStepResult } from '../types';

/**
 * Template for creating new screenshot steps
 * 
 * To add a new website screenshot:
 * 1. Copy this file and rename it (e.g., yahoofinance.ts)
 * 2. Update the name, URL construction, and selector logic
 * 3. Export it from steps/index.ts
 * 4. Add it to SCREENSHOT_STEPS array in screenshot.ts
 */

// Example configuration - update these for your website
const WEBSITE_BASE_URL = 'https://example.com/quote';
const WEBSITE_SELECTOR = '.target-element-selector';

export const templateStep: ScreenshotStep = {
  name: 'template', // Change this to your website name
  execute: async (browser: Browser, page: Page, ticker: string, sendEvent?: (event: string, data: any) => void): Promise<ScreenshotStepResult> => {
    const url = `${WEBSITE_BASE_URL}?symbol=${ticker.toUpperCase()}`;
    
    const log = (message: string, step?: string) => {
      console.log(`[Template] ${message}`);
      if (sendEvent) {
        sendEvent('status', { 
          message: `[Template] ${message}`, 
          step: step || 'template_step',
          website: 'template',
          url: url 
        });
      }
    };

    try {
      log(`Navigating to ${url}...`, 'template_navigating');
      
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      log('Page loaded', 'template_page_loaded');

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for the target element
      log(`Waiting for element with selector: ${WEBSITE_SELECTOR}`, 'template_finding_element');
      
      let element: ElementHandle | null = null;
      let foundSelector = WEBSITE_SELECTOR;

      try {
        await page.waitForSelector(WEBSITE_SELECTOR, {
          timeout: 10000
        });
        element = await page.$(WEBSITE_SELECTOR);
        if (element) {
          log(`Found element with selector: ${WEBSITE_SELECTOR}`, 'template_element_found');
        }
      } catch (selectorError) {
        // Add fallback selectors if needed
        const alternativeSelectors: string[] = [
          // Add alternative selectors here
        ];

        for (const selector of alternativeSelectors) {
          try {
            await page.waitForSelector(selector, {
              timeout: 3000
            });
            element = await page.$(selector);
            if (element) {
              foundSelector = selector;
              log(`Found element with fallback selector: ${selector}`, 'template_element_found');
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!element || !foundSelector) {
        const error = 'Could not find target element';
        log(error, 'template_error');
        return {
          name: 'template',
          success: false,
          url: url,
          error: error,
          timestamp: new Date().toISOString()
        };
      }

      // Take screenshot
      log('Taking screenshot...', 'template_taking_screenshot');
      const screenshot = (await element.screenshot({
        type: 'png'
      })) as Buffer;
      
      log('Screenshot taken successfully', 'template_screenshot_complete');

      const base64Screenshot = screenshot.toString('base64');
      
      return {
        name: 'template',
        success: true,
        image: `data:image/png;base64,${base64Screenshot}`,
        url: url,
        selector: foundSelector,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred while taking the screenshot';
      log(`Error: ${errorMessage}`, 'template_error');
      return {
        name: 'template',
        success: false,
        url: url,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }
};

