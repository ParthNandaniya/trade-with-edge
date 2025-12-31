import { useState } from 'react'
import { ConfigProvider, Layout, Button, Card, Typography, Space } from 'antd'
import { FireOutlined } from '@ant-design/icons'
import './App.css'
import { auth, db } from './firebase/config'
import { antdTheme } from './theme/antd-theme'

const { Header, Content, Footer } = Layout
const { Title, Paragraph } = Typography

function App() {
  const [count, setCount] = useState(0)

  return (
    <ConfigProvider theme={antdTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', background: '#001529' }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            <FireOutlined /> Dashboard
          </Title>
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

