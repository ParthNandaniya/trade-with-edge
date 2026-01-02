import { useState, useEffect } from 'react'
import { ConfigProvider, Layout, Button, Typography, Tabs } from 'antd'
import { FireOutlined, MoonOutlined, SunOutlined, RiseOutlined, CameraOutlined } from '@ant-design/icons'
import moment from 'moment'
import './App.css'
import { lightTheme, darkTheme } from './theme/antd-theme'
import { Screenshot } from './components/Screenshot'
import { GainersLosers } from './components/GainersLosers'

const { Header, Content, Footer } = Layout
const { Title } = Typography

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme')
    return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  const [activeTab, setActiveTab] = useState('gainers-losers')

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
          padding: '0 24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            <FireOutlined /> Dashboard
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'center', maxWidth: '600px' }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'gainers-losers',
                  label: (
                    <span>
                      <RiseOutlined /> Top Gainers/Losers
                    </span>
                  ),
                },
                {
                  key: 'screenshot',
                  label: (
                    <span>
                      <CameraOutlined /> Stock Screenshot
                    </span>
                  ),
                },
              ]}
              tabBarStyle={{ 
                margin: 0,
                color: '#fff'
              }}
            />
          </div>
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
          <div style={{ display: activeTab === 'gainers-losers' ? 'block' : 'none' }}>
            <GainersLosers />
          </div>
          <div style={{ display: activeTab === 'screenshot' ? 'block' : 'none' }}>
            <Screenshot />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Dashboard ©{moment().year()} Created with Ant Design
        </Footer>
      </Layout>
    </ConfigProvider>
  )
}

export default App

