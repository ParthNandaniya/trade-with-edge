import { openaiClient, isOpenAIConfigured } from './config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

/**
 * Send a chat completion request to OpenAI
 */
export const chatCompletion = async (
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> => {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI is not configured. Please set VITE_OPENAI_API_KEY in your .env file')
  }

  if (!openaiClient) {
    throw new Error('OpenAI client is not initialized')
  }

  try {
    const response = await openaiClient.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo',
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: false,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

/**
 * Stream chat completion (for real-time responses)
 */
export const streamChatCompletion = async function* (
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): AsyncGenerator<string, void, unknown> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI is not configured. Please set VITE_OPENAI_API_KEY in your .env file')
  }

  if (!openaiClient) {
    throw new Error('OpenAI client is not initialized')
  }

  try {
    const stream = await openaiClient.chat.completions.create({
      model: options.model || 'gpt-3.5-turbo',
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        yield content
      }
    }
  } catch (error) {
    console.error('OpenAI streaming error:', error)
    throw error
  }
}

/**
 * Get available models (if needed)
 */
export const getModels = async (): Promise<string[]> => {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI is not configured. Please set VITE_OPENAI_API_KEY in your .env file')
  }

  if (!openaiClient) {
    throw new Error('OpenAI client is not initialized')
  }

  try {
    const models = await openaiClient.models.list()
    return models.data.map((model) => model.id)
  } catch (error) {
    console.error('Error fetching models:', error)
    throw error
  }
}

