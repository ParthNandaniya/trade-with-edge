/**
 * Server Configuration
 * 
 * Centralized configuration for all environment variables and server settings.
 * This ensures consistent access to environment variables across the backend.
 */

export const config = {
  // Server configuration
  port: process.env.PORT || 3001,
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  
  // Alpha Vantage API configuration
  alphaVantage: {
    apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
  },
} as const;

// Type-safe access to config values
export type Config = typeof config;

