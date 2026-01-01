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

export interface ScreenshotResponse {
  success: boolean;
  ticker: string;
  screenshots: ScreenshotStepResult[];
  timestamp: string;
}

