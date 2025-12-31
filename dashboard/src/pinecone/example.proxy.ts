/**
 * Example: Using Pinecone with Proxy Configuration
 * 
 * This example demonstrates how to use Pinecone with proxy support
 * in a Node.js environment (backend, build scripts, etc.)
 * 
 * DO NOT use this in browser/frontend code
 */

import { pineconeClient, isPineconeConfigured } from './config.proxy'

async function listIndexes() {
  // Check if Pinecone is configured
  if (!isPineconeConfigured() || !pineconeClient) {
    console.error('Pinecone is not configured. Please set PINECONE_API_KEY environment variable.')
    return
  }

  try {
    // List all indexes
    const indexes = await pineconeClient.listIndexes()
    console.log('My indexes:', indexes)
    return indexes
  } catch (error) {
    console.error('Error listing indexes:', error)
    throw error
  }
}

// Example usage (uncomment to run directly)
// listIndexes()
//   .then(() => {
//     console.log('Successfully listed indexes')
//     process.exit(0)
//   })
//   .catch((error) => {
//     console.error('Failed to list indexes:', error)
//     process.exit(1)
//   })

export { listIndexes }

