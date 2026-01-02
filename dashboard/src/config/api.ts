/**
 * API Configuration
 * 
 * Centralized API endpoint configuration that adapts to environment.
 * Uses environment variables for production, falls back to localhost for development.
 */

const getApiBaseUrl = (): string => {
  // Check if VITE_API_URL is explicitly set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, use the Firebase Functions URL
  if (import.meta.env.PROD) {
    // Firebase Functions URL format: https://{region}-{project-id}.cloudfunctions.net/api
    // Replace YOUR_PROJECT_ID with your actual project ID
    return 'https://us-central1-trade-with-edge.cloudfunctions.net/api';
  }
  
  // Development: use localhost
  return 'http://localhost:3001';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  SCREENSHOT_STREAM: `${getApiBaseUrl()}/api/screenshot/stream`,
  TICKER_SEARCH: `${getApiBaseUrl()}/api/ticker/search`,
  GAINERS_LOSERS: `${getApiBaseUrl()}/api/gainers-losers`,
} as const;

