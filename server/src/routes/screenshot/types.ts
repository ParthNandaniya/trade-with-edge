import { Page, Browser } from 'puppeteer';

export interface ScreenshotStepConfig {
  name: string;
  url: string;
  selector?: string;
  waitForSelector?: string;
  timeout?: number;
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  };
}

export interface ScreenshotStepResult {
  name: string;
  variant?: string; // Optional variant to differentiate between multiple screenshots of the same source
  success: boolean;
  image?: string; // base64 encoded image
  url: string;
  selector?: string;
  error?: string;
  timestamp: string;
}

export interface ScreenshotStep {
  name: string;
  execute: (browser: Browser, page: Page, ticker: string, sendEvent?: (event: string, data: any) => void) => Promise<ScreenshotStepResult>;
}

export interface AlphaVantageNewsData {
  success: boolean;
  data?: any; // News sentiment data
  error?: string;
}

export interface AlphaVantageTradingData {
  success: boolean;
  data?: any; // Time series data
  error?: string;
}

export interface AlphaVantageData {
  news?: AlphaVantageNewsData;
  trading?: AlphaVantageTradingData;
}

export interface ScreenshotResponse {
  success: boolean;
  ticker: string;
  screenshots: ScreenshotStepResult[];
  alphaVantage?: AlphaVantageData;
  timestamp: string;
}

