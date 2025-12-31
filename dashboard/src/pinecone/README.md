# Pinecone Integration

This project includes Pinecone integration for vector database operations and semantic search.

## Setup

1. Get your Pinecone API key from [Pinecone Console](https://app.pinecone.io/)

2. Add your API key to the `.env` file:
   ```env
   VITE_PINECONE_API_KEY=your_api_key_here
   ```

3. Restart your development server after adding the API key

## Usage

### Basic Usage

```typescript
import { pineconeClient, isPineconeConfigured } from './pinecone'

// Check if Pinecone is configured
if (isPineconeConfigured() && pineconeClient) {
  // List all indexes
  const indexes = await pineconeClient.listIndexes()
  console.log('Available indexes:', indexes)
  
  // Get a specific index
  const index = pineconeClient.index('your-index-name')
  
  // Query vectors
  const queryResponse = await index.query({
    vector: [0.1, 0.2, 0.3, ...], // your vector
    topK: 10,
    includeMetadata: true
  })
  
  // Upsert vectors
  await index.upsert([
    {
      id: 'vector-id-1',
      values: [0.1, 0.2, 0.3, ...],
      metadata: { text: 'sample text' }
    }
  ])
}
```

### Using the Client Directly

```typescript
import { pineconeClient } from './pinecone'

async function searchVectors() {
  if (!pineconeClient) {
    console.error('Pinecone client is not configured')
    return
  }
  
  try {
    // Get an index
    const index = pineconeClient.index('my-index')
    
    // Query the index
    const results = await index.query({
      vector: [/* your embedding vector */],
      topK: 5,
      includeMetadata: true,
      includeValues: false
    })
    
    return results
  } catch (error) {
    console.error('Pinecone query error:', error)
  }
}
```

### Helper Functions

```typescript
import { 
  pineconeClient, 
  isPineconeConfigured, 
  getPineconeApiKey 
} from './pinecone'

// Check if configured
if (isPineconeConfigured()) {
  console.log('Pinecone is ready to use')
}

// Get API key (for debugging only)
const apiKey = getPineconeApiKey()
```

## Common Operations

### Creating an Index

```typescript
if (pineconeClient) {
  await pineconeClient.createIndex({
    name: 'my-index',
    dimension: 1536, // dimension of your vectors
    metric: 'cosine', // or 'euclidean', 'dotproduct'
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1'
      }
    }
  })
}
```

### Upserting Vectors

```typescript
const index = pineconeClient.index('my-index')

await index.upsert([
  {
    id: '1',
    values: [0.1, 0.2, 0.3, ...],
    metadata: { category: 'example', text: 'sample' }
  }
])
```

### Querying Vectors

```typescript
const queryResponse = await index.query({
  vector: [0.1, 0.2, 0.3, ...],
  topK: 10,
  includeMetadata: true,
  includeValues: false,
  filter: {
    category: { $eq: 'example' }
  }
})
```

## Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [Node.js SDK Reference](https://docs.pinecone.io/reference/sdks/node/overview)
- [Pinecone Console](https://app.pinecone.io/)

## Proxy Configuration (Node.js Only)

If you need to use Pinecone through a proxy (e.g., corporate network, mitmproxy), use the proxy configuration file:

**For Node.js environments (backend, build scripts):**

```typescript
// Use config.proxy.ts instead of config.ts
import { pineconeClient } from './pinecone/config.proxy'
```

**Environment variables for proxy setup:**

```env
PINECONE_API_KEY=your_api_key_here
PINECONE_PROXY_URI=https://your-proxy.com
PINECONE_PROXY_HOST=your-proxy-host
PINECONE_PROXY_PORT=your-proxy-port
PINECONE_PROXY_CERT_PATH=path/to/mitmproxy-ca-cert.pem  # Optional
```

**Example usage with proxy:**

```typescript
import { pineconeClient } from './pinecone/config.proxy'

if (pineconeClient) {
  const indexes = await pineconeClient.listIndexes()
  console.log('My indexes:', indexes)
}
```

⚠️ **Note**: Proxy configuration uses Node.js-specific modules (`fs`, `undici`) and will NOT work in browser environments. Use `config.ts` for browser/frontend code.

## Security Note

⚠️ **Important**: The Pinecone API key is exposed in the browser when using it in a frontend application.

For production applications, you should:
1. Use a backend proxy to handle Pinecone API calls
2. Never expose your API key in client-side code
3. Implement rate limiting and usage monitoring
4. Consider using Pinecone's serverless indexes for better security

This setup is suitable for development and testing only.

