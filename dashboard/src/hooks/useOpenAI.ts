import { useState, useCallback } from 'react'
import { chatCompletion, streamChatCompletion, ChatMessage, ChatCompletionOptions } from '../openai/services'
import { isOpenAIConfigured } from '../openai/config'

interface UseOpenAIReturn {
  isLoading: boolean
  error: Error | null
  response: string | null
  sendMessage: (messages: ChatMessage[], options?: ChatCompletionOptions) => Promise<string>
  streamMessage: (messages: ChatMessage[], options?: ChatCompletionOptions) => AsyncGenerator<string, void, unknown>
  clearError: () => void
  clearResponse: () => void
  isConfigured: boolean
}

/**
 * React hook for OpenAI chat completions
 */
export const useOpenAI = (): UseOpenAIReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [response, setResponse] = useState<string | null>(null)
  const isConfigured = isOpenAIConfigured()

  const sendMessage = useCallback(
    async (messages: ChatMessage[], options?: ChatCompletionOptions): Promise<string> => {
      if (!isConfigured) {
        const err = new Error('OpenAI is not configured')
        setError(err)
        throw err
      }

      setIsLoading(true)
      setError(null)
      setResponse(null)

      try {
        const result = await chatCompletion(messages, options)
        setResponse(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [isConfigured]
  )

  const streamMessage = useCallback(
    (messages: ChatMessage[], options?: ChatCompletionOptions): AsyncGenerator<string, void, unknown> => {
      if (!isConfigured) {
        const err = new Error('OpenAI is not configured')
        setError(err)
        throw err
      }

      setIsLoading(true)
      setError(null)
      setResponse('')

      return (async function* () {
        try {
          let fullResponse = ''
          for await (const chunk of streamChatCompletion(messages, options)) {
            fullResponse += chunk
            setResponse(fullResponse)
            yield chunk
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Unknown error occurred')
          setError(error)
          throw error
        } finally {
          setIsLoading(false)
        }
      })()
    },
    [isConfigured]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const clearResponse = useCallback(() => {
    setResponse(null)
  }, [])

  return {
    isLoading,
    error,
    response,
    sendMessage,
    streamMessage,
    clearError,
    clearResponse,
    isConfigured,
  }
}

