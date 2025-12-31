import { Pinecone, type PineconeConfiguration } from '@pinecone-database/pinecone'

/**
 * Pinecone Configuration for Browser/Frontend
 * 
 * This is the default configuration for browser environments.
 * For Node.js environments with proxy support, use config.proxy.ts instead
 */

// Pinecone configuration
const apiKey = import.meta.env.VITE_PINECONE_API_KEY

if (!apiKey) {
  console.warn('Pinecone API key is not set. Please add VITE_PINECONE_API_KEY to your .env file')
}

// Initialize Pinecone client
let pineconeClient: Pinecone | null = null

try {
  if (apiKey) {
    const config: PineconeConfiguration = {
      apiKey: apiKey,
    }

    pineconeClient = new Pinecone(config)
  }
} catch (error) {
  console.error('Pinecone initialization error:', error)
}

// Export the client (will be null if API key is not set)
export { pineconeClient }

// Export a helper function to check if Pinecone is configured
export const isPineconeConfigured = (): boolean => {
  return pineconeClient !== null && apiKey !== undefined
}

// Export a helper to get the API key (useful for debugging)
export const getPineconeApiKey = (): string | undefined => {
  return apiKey
}

