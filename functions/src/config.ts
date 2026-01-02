/**
 * Server Configuration for Firebase Functions
 * 
 * Centralized configuration for all environment variables and server settings.
 */

export const config = {
  // CORS configuration
  cors: {
    origin: true, // Allow all origins in Firebase Functions
    credentials: true,
  },
  
  // Alpha Vantage API configuration
  alphaVantage: {
    apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
  },
} as const;

// Type-safe access to config values
export type Config = typeof config;

