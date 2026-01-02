/**
 * Puppeteer Configuration for Firebase Functions
 * 
 * Uses @sparticuz/chromium for serverless environments
 */

import puppeteer, { Browser, LaunchOptions } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Configure Chromium for serverless
chromium.setGraphicsMode(false);

export async function launchBrowser(): Promise<Browser> {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';
  
  const options: LaunchOptions = {
    args: isProduction ? chromium.args : [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath: isProduction 
      ? await chromium.executablePath() 
      : undefined, // Use local Chrome in development
    headless: chromium.headless,
  };

  return await puppeteer.launch(options);
}

