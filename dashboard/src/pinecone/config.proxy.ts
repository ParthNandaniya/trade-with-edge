/**
 * Pinecone Configuration with Proxy Support
 * 
 * This configuration is for Node.js environments only (backend, build scripts, etc.)
 * It supports proxy configuration for corporate networks or mitmproxy setups.
 * 
 * DO NOT use this in browser/frontend code - use config.ts instead
 */

import {
  Pinecone,
  type PineconeConfiguration,
} from '@pinecone-database/pinecone'
import { Dispatcher, ProxyAgent } from 'undici'
import * as fs from 'fs'
import * as path from 'path'

// Pinecone API key
const apiKey = process.env.PINECONE_API_KEY || process.env.VITE_PINECONE_API_KEY

if (!apiKey) {
  console.warn('Pinecone API key is not set. Please set PINECONE_API_KEY or VITE_PINECONE_API_KEY')
}

// Proxy configuration (optional)
const proxyUri = process.env.PINECONE_PROXY_URI
const proxyHost = process.env.PINECONE_PROXY_HOST
const proxyPort = process.env.PINECONE_PROXY_PORT
const proxyCertPath = process.env.PINECONE_PROXY_CERT_PATH

// Initialize Pinecone client with optional proxy
let pineconeClient: Pinecone | null = null

try {
  if (apiKey) {
    const config: PineconeConfiguration = {
      apiKey: apiKey,
    }

    // Add proxy configuration if provided
    if (proxyUri && proxyHost && proxyPort) {
      let cert: Buffer | undefined

      // Load certificate if provided
      if (proxyCertPath) {
        try {
          const certPath = path.isAbsolute(proxyCertPath)
            ? proxyCertPath
            : path.join(process.cwd(), proxyCertPath)
          cert = fs.readFileSync(certPath)
        } catch (error) {
          console.error('Failed to load proxy certificate:', error)
        }
      }

      // Create ProxyAgent
      const client = new ProxyAgent({
        uri: proxyUri,
        requestTls: {
          port: proxyPort,
          host: proxyHost,
          ...(cert && { ca: cert }),
        },
      })

      // Create custom fetch with proxy
      const customFetch = (
        input: string | URL | Request,
        init: RequestInit | undefined
      ) => {
        return fetch(input, {
          ...init,
          dispatcher: client as Dispatcher,
          keepalive: true, // optional
        })
      }

      config.fetchApi = customFetch
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

