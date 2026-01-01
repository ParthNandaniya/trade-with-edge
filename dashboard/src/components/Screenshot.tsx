import { useState } from 'react';
import { Button, Input, Card, Image, Spin, message, Space, Typography } from 'antd';
import { CameraOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title } = Typography;

const API_URL = 'http://localhost:3001/api/screenshot';

export const Screenshot = () => {
  const [ticker, setTicker] = useState('RAIN');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takeScreenshot = async () => {
    if (!ticker || ticker.trim() === '') {
      message.error('Please enter a ticker symbol');
      return;
    }

    setLoading(true);
    setScreenshot(null);

    try {
      const response = await fetch(`${API_URL}?ticker=${encodeURIComponent(ticker.trim().toUpperCase())}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to take screenshot');
      }

      const data = await response.json();
      setScreenshot(data.image);
      message.success(`Screenshot captured for ${data.ticker}!`);
    } catch (error) {
      console.error('Error taking screenshot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to take screenshot. Make sure the backend server is running.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={4}>Finviz Stock Screenshot</Title>
        
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Enter ticker symbol (e.g., RAIN, AAPL, TSLA)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onPressEnter={takeScreenshot}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<CameraOutlined />}
            onClick={takeScreenshot}
            loading={loading}
          >
            Capture Screenshot
          </Button>
        </Space.Compact>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" tip="Taking screenshot..." />
          </div>
        )}

        {screenshot && !loading && (
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0 }}>Screenshot Preview</Title>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={takeScreenshot}
                  loading={loading}
                >
                  Retake
                </Button>
              </div>
              <Image
                src={screenshot}
                alt="Screenshot"
                style={{ maxWidth: '100%', borderRadius: '8px' }}
                preview={{
                  mask: 'Preview',
                }}
              />
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  );
};
