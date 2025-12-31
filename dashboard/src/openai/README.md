# OpenAI Integration

This project includes OpenAI integration for chat completions and other AI features.

## Setup

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)

2. Add your API key to the `.env` file:
   ```env
   VITE_OPENAI_API_KEY=your_api_key_here
   ```

3. Restart your development server after adding the API key

## Usage

### Using the React Hook

```typescript
import { useOpenAI } from '../hooks/useOpenAI'
import type { ChatMessage } from '../openai/services'

function MyComponent() {
  const { sendMessage, isLoading, error, response, isConfigured } = useOpenAI()

  const handleChat = async () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ]

    try {
      const result = await sendMessage(messages, {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
      })
      console.log(result)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      {isConfigured ? (
        <button onClick={handleChat} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Send Message'}
        </button>
      ) : (
        <p>OpenAI not configured</p>
      )}
    </div>
  )
}
```

### Using the Service Directly

```typescript
import { chatCompletion, streamChatCompletion } from '../openai/services'
import type { ChatMessage } from '../openai/services'

// Simple chat completion
const messages: ChatMessage[] = [
  { role: 'user', content: 'Hello!' }
]

const response = await chatCompletion(messages, {
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
})

// Streaming chat completion
for await (const chunk of streamChatCompletion(messages)) {
  console.log(chunk) // Process each chunk as it arrives
}
```

### Available Models

You can use any OpenAI model. Common options:
- `gpt-4` - Most capable model
- `gpt-4-turbo` - Faster GPT-4
- `gpt-3.5-turbo` - Fast and cost-effective (default)
- `gpt-3.5-turbo-16k` - GPT-3.5 with larger context

### Example Component

See `src/components/OpenAIChat.tsx` for a complete chat interface example.

## Security Note

⚠️ **Important**: The OpenAI API key is exposed in the browser when using `dangerouslyAllowBrowser: true`. 

For production applications, you should:
1. Use a backend proxy to handle OpenAI API calls
2. Never expose your API key in client-side code
3. Implement rate limiting and usage monitoring

This setup is suitable for development and testing only.

