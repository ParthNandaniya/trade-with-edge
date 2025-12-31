import React, { useState } from 'react'
import { Card, Input, Button, Space, Typography, Alert, Spin } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { useOpenAI } from '../hooks/useOpenAI'
import type { ChatMessage } from '../openai/services'

const { TextArea } = Input
const { Title, Paragraph } = Typography

const OpenAIChat: React.FC = () => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: 'You are a helpful assistant.',
    },
  ])
  const { isLoading, error, response, sendMessage, clearError, isConfigured } = useOpenAI()

  const handleSend = async () => {
    if (!input.trim() || !isConfigured) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')

    try {
      const assistantResponse = await sendMessage(newMessages, {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
      })

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: assistantResponse,
        },
      ])
    } catch (err) {
      console.error('Error sending message:', err)
    }
  }

  if (!isConfigured) {
    return (
      <Card>
        <Alert
          message="OpenAI Not Configured"
          description="Please add VITE_OPENAI_API_KEY to your .env file to use OpenAI features."
          type="warning"
          showIcon
        />
      </Card>
    )
  }

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>OpenAI Chat</Title>
          <Paragraph type="secondary">Ask me anything!</Paragraph>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error.message}
            type="error"
            showIcon
            closable
            onClose={clearError}
          />
        )}

        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
          {messages
            .filter((msg) => msg.role !== 'system')
            .map((msg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '12px',
                  padding: '8px',
                  backgroundColor: msg.role === 'user' ? '#f0f0f0' : '#e6f7ff',
                  borderRadius: '4px',
                }}
              >
                <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
                <div style={{ marginTop: '4px' }}>{msg.content}</div>
              </div>
            ))}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
            </div>
          )}
        </div>

        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={isLoading}
            disabled={!input.trim()}
          >
            Send
          </Button>
        </Space.Compact>
      </Space>
    </Card>
  )
}

export default OpenAIChat

