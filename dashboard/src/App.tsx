import { useState, useEffect } from 'react'
import { ConfigProvider, Layout, Button, Card, Typography, Space } from 'antd'
import { FireOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import './App.css'
import { lightTheme, darkTheme } from './theme/antd-theme'

const { Header, Content, Footer } = Layout
const { Title, Paragraph } = Typography

function App() {
  const [count, setCount] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme')
    return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev)
  }

  const currentTheme = isDarkMode ? darkTheme : lightTheme

  return (
    <ConfigProvider theme={currentTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 24px'
        }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            <FireOutlined /> Dashboard
          </Title>
          <Button
            type="text"
            icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            style={{ 
              color: '#fff',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          />
        </Header>
        <Content style={{ padding: '24px' }}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Title level={2}>Welcome to Dashboard</Title>
                <Paragraph>React TypeScript + Firebase + Ant Design</Paragraph>
              </div>
              <div>
                <Button 
                  type="primary" 
                  size="large"
                  onClick={() => setCount((count) => count + 1)}
                >
                  Count is {count}
                </Button>
              </div>
              <Paragraph type="secondary">
                Edit <code>src/App.tsx</code> to get started
              </Paragraph>
            </Space>
          </Card>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Dashboard ©2024 Created with Ant Design
        </Footer>
      </Layout>
    </ConfigProvider>
  )
}

export default App

