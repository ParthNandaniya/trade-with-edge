import { useState } from 'react';
import { Button, Input, Card, Image, Spin, message, Space, Typography, Modal } from 'antd';
import { CameraOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';

const { Title } = Typography;

const API_URL = 'http://localhost:3001/api/screenshot';

export const Screenshot = () => {
  const [ticker, setTicker] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const downloadScreenshot = () => {
    if (!screenshot) return;

    // Extract base64 data from data URL
    const base64Data = screenshot.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ticker.toUpperCase()}_screenshot.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('Screenshot downloaded successfully!');
  };

  const showTickerNotFoundAlert = () => {
    Modal.error({
      title: 'Ticker Symbol Not Found',
      content: `The ticker symbol "${ticker.toUpperCase()}" was not found. Please check the symbol and try again.`,
      okText: 'OK',
    });
  };

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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to take screenshot';
        
        // Check if it's a ticker not found error
        if (errorMessage.toLowerCase().includes('not found') || 
            errorMessage.toLowerCase().includes('ticker') ||
            response.status === 404) {
          showTickerNotFoundAlert();
        } else {
          message.error(errorMessage);
        }
        return;
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
            style={{ width: '200px' }}
          />
          <Button
            type="primary"
            icon={<CameraOutlined />}
            onClick={takeScreenshot}
            loading={loading}
          >
            Take Screenshot
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
                <Space>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={downloadScreenshot}
                  >
                    Download
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={takeScreenshot}
                    loading={loading}
                  >
                    Retake
                  </Button>
                </Space>
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
