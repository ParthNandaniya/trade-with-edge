import OpenAI from 'openai'

// OpenAI configuration
const apiKey = import.meta.env.VITE_OPENAI_API_KEY

if (!apiKey) {
  console.warn('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to your .env file')
}

// Initialize OpenAI client
let openaiClient: OpenAI | null = null

try {
  if (apiKey) {
    openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    })
  }
} catch (error) {
  console.error('OpenAI initialization error:', error)
}

// Export the client (will be null if API key is not set)
export { openaiClient }

// Export a helper function to check if OpenAI is configured
export const isOpenAIConfigured = (): boolean => {
  return openaiClient !== null && apiKey !== undefined
}

// Export a helper to get the API key (useful for debugging)
export const getOpenAIApiKey = (): string | undefined => {
  return apiKey
}

