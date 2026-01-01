import { Page, Browser } from 'puppeteer';
import { ScreenshotStep, ScreenshotStepResult } from '../types';

const TRADINGVIEW_BASE_URL = 'https://www.tradingview.com/chart';

/**
 * Configuration for button clicks before taking screenshot
 */
export interface ButtonClickConfig {
  selector: string; // CSS selector for the button to click
  waitAfter?: number; // Milliseconds to wait after clicking (default: 1000)
  waitForSelector?: string; // Optional selector to wait for after clicking
  waitForSelectorTimeout?: number; // Timeout for waiting for selector (default: 10000)
}

/**
 * Configuration for TradingView screenshot step
 */
export interface TradingViewStepConfig {
  variant: string;
  buttonClicks?: ButtonClickConfig[]; // Array of buttons to click before taking screenshot
}

/**
 * Creates a TradingView screenshot step with a specific variant and optional button clicks
 */
function createTradingViewStep(config: TradingViewStepConfig): ScreenshotStep {
  const { variant, buttonClicks = [] } = config;
  return {
    name: 'tradingview',
    execute: async (browser: Browser, page: Page, ticker: string, sendEvent?: (event: string, data: any) => void): Promise<ScreenshotStepResult> => {
      // URL format: https://www.tradingview.com/chart/?symbol=NASDAQ%3ARAIN
      const url = `${TRADINGVIEW_BASE_URL}/?symbol=NASDAQ%3A${ticker.toUpperCase()}`;
      
      const log = (message: string, step?: string) => {
        console.log(`[TradingView ${variant}] ${message}`);
        if (sendEvent) {
          sendEvent('status', { 
            message: `[TradingView ${variant}] ${message}`, 
            step: step || `tradingview_${variant}_step`,
            website: 'tradingview',
            variant: variant,
            url: url 
          });
        }
      };

      try {
        log(`Navigating to ${url}...`, `tradingview_${variant}_navigating`);
        
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });

        const currentUrl = page.url();
        log(`Page loaded at ${currentUrl}`, `tradingview_${variant}_page_loaded`);

        // Wait for the specific layout areas to load
        log('Waiting for layout areas to load...', `tradingview_${variant}_waiting_layout`);
        
        // Wait for both elements to appear
        try {
          await page.waitForSelector('.layout__area--top', {
            timeout: 30000
          });
          log('Top layout area found', `tradingview_${variant}_top_found`);
          
          await page.waitForSelector('.layout__area--center', {
            timeout: 30000
          });
          log('Center layout area found', `tradingview_${variant}_center_found`);
        } catch (selectorError) {
          log('Layout areas not found, waiting additional time...', `tradingview_${variant}_waiting`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Give extra time for content to fully render
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Click buttons if configured (for second screenshot)
        if (buttonClicks && buttonClicks.length > 0) {
          log(`Clicking ${buttonClicks.length} button(s) before taking screenshot...`, `tradingview_${variant}_clicking_buttons`);
          
          for (let i = 0; i < buttonClicks.length; i++) {
            const buttonConfig = buttonClicks[i];
            
            try {
              log(`Clicking button ${i + 1}/${buttonClicks.length}: ${buttonConfig.selector}`, `tradingview_${variant}_click_button_${i + 1}`);
              
              // Wait for button to be available
              await page.waitForSelector(buttonConfig.selector, {
                timeout: buttonConfig.waitForSelectorTimeout || 10000,
                visible: true
              });
              
              // Click the button
              await page.click(buttonConfig.selector);
              log(`Button ${i + 1} clicked successfully`, `tradingview_${variant}_button_${i + 1}_clicked`);
              
              // Wait for optional selector after click
              if (buttonConfig.waitForSelector) {
                log(`Waiting for element: ${buttonConfig.waitForSelector}`, `tradingview_${variant}_waiting_after_click_${i + 1}`);
                await page.waitForSelector(buttonConfig.waitForSelector, {
                  timeout: buttonConfig.waitForSelectorTimeout || 10000
                }).catch(() => {
                  log(`Element ${buttonConfig.waitForSelector} not found, continuing...`, `tradingview_${variant}_wait_skipped_${i + 1}`);
                });
              }
              
              // Wait after click (default 1 second)
              const waitTime = buttonConfig.waitAfter || 1000;
              await new Promise(resolve => setTimeout(resolve, waitTime));
              
            } catch (buttonError: any) {
              log(`Error clicking button ${i + 1}: ${buttonError.message}`, `tradingview_${variant}_button_error_${i + 1}`);
              // Continue with other buttons even if one fails
            }
          }
          
          log('All buttons clicked, dismissing tooltips...', `tradingview_${variant}_buttons_complete`);
          
          // Press ESC key to dismiss any tooltips that might be showing
          try {
            await page.keyboard.press('Escape');
            log('ESC key pressed to dismiss tooltips', `tradingview_${variant}_dismiss_tooltips`);
            // Wait a bit for tooltips to disappear
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (escError) {
            log('Error pressing ESC key, continuing...', `tradingview_${variant}_esc_error`);
          }
          
          // Additional wait after all buttons are clicked and tooltips dismissed
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Get bounding boxes of both elements and calculate combined area
        log('Calculating combined bounding box...', `tradingview_${variant}_calculating_bounds`);
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

        log(`Taking screenshot of combined area: ${bounds.width}x${bounds.height} at (${bounds.x}, ${bounds.y})`, `tradingview_${variant}_taking_screenshot`);
        
        // Take screenshot of the combined area
        const screenshot = (await page.screenshot({
          type: 'png',
          clip: bounds
        })) as Buffer;
        
        log('Screenshot taken successfully', `tradingview_${variant}_screenshot_complete`);

        const base64Screenshot = screenshot.toString('base64');
        
        return {
          name: 'tradingview',
          variant: variant,
          success: true,
          image: `data:image/png;base64,${base64Screenshot}`,
          url: url,
          timestamp: new Date().toISOString()
        };

      } catch (error: any) {
        const errorMessage = error.message || 'An error occurred while taking the screenshot';
        log(`Error: ${errorMessage}`, `tradingview_${variant}_error`);
        return {
          name: 'tradingview',
          variant: variant,
          success: false,
          url: url,
          error: errorMessage,
          timestamp: new Date().toISOString()
        };
      }
    }
  };
}

// Export default TradingView step (variant: 'default')
export const tradingviewStep = createTradingViewStep({ variant: 'default' });

// Export second TradingView step (variant: 'day')
// This step clicks buttons to configure the chart before taking screenshot
export const tradingviewStep2 = createTradingViewStep({
  variant: 'day',
  buttonClicks: [
    // FIXME: solve this later, enable extended hours in the screenshot here
    // {
    //   // selector: '.chart-controls-bar > div > div:nth-child(3)',
    //   selector: '.chart-controls-bar > div > div:nth-child(3) > div:nth-child(2) > div > button',
    //   waitAfter: 2000, // Wait 2 seconds after clicking to allow menu to open
    //   waitForSelectorTimeout: 15000, // Wait up to 15 seconds for the button to appear
    // },
    // {
    //   selector: 'div[data-qa-id="menu-inner"] div[data-role="menuitem"]',
    //   waitAfter: 1500, // Wait 1.5 seconds after clicking
    // },
    {
      selector: 'button[aria-label="1 day in 1 minute intervals"]',
      waitAfter: 2000, // Wait 2 seconds after clicking to allow chart to update
    },
  ]
});
