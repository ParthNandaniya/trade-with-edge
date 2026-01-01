import { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, Image, Spin, message, Space, Typography, Modal, Timeline, Tag, Drawer } from 'antd';
import { CameraOutlined, ReloadOutlined, DownloadOutlined, LoadingOutlined, CheckCircleOutlined, ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const API_STREAM_URL = 'http://localhost:3001/api/screenshot/stream';

export const Screenshot = () => {
  const [ticker, setTicker] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<Array<{ message: string; step: string; timestamp: Date; url?: string }>>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [hasError, setHasError] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

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

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const takeScreenshot = () => {
    if (!ticker || ticker.trim() === '') {
      message.error('Please enter a ticker symbol');
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setLoading(true);
    setScreenshot(null);
    setStatusUpdates([]);
    setCurrentUrl(null);
    setShowStatusPanel(true);
    setHasError(false);

    const tickerUpper = ticker.trim().toUpperCase();
    const eventSource = new EventSource(`${API_STREAM_URL}?ticker=${encodeURIComponent(tickerUpper)}`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setStatusUpdates(prev => [...prev, { 
        message: data.message, 
        step: data.step, 
        timestamp: new Date(),
        url: data.url 
      }]);
      if (data.url) {
        setCurrentUrl(data.url);
      }
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setScreenshot(data.image);
      setLoading(false);
      setHasError(false);
      message.success(`Screenshot captured for ${data.ticker}!`);
      // Auto-close panel on successful completion
      setTimeout(() => {
        setShowStatusPanel(false);
      }, 500);
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.addEventListener('error', (e: MessageEvent) => {
      const data = e.data ? JSON.parse(e.data) : { error: 'Unknown error', message: 'Failed to take screenshot' };
      
      setHasError(true);
      setLoading(false);
      // Keep panel open on error so user can see what went wrong
      
      if (data.error?.toLowerCase().includes('not found') || 
          data.message?.toLowerCase().includes('ticker')) {
        showTickerNotFoundAlert();
      } else {
        message.error(data.message || data.error || 'Failed to take screenshot');
      }
      
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setHasError(true);
      setLoading(false);
      // Keep panel open on error
      message.error('Connection error. Make sure the backend server is running.');
      eventSource.close();
      eventSourceRef.current = null;
    };
  };

  return (
    <>
      <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>Finviz Stock Screenshot</Title>
          {(statusUpdates.length > 0 || hasError) && (
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => setShowStatusPanel(true)}
              size="small"
            >
              View Steps
            </Button>
          )}
        </div>
        
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

      {/* Right Side Drawer for Process Steps */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading ? (
              <Spin size="small" indicator={<LoadingOutlined style={{ fontSize: 14 }} spin />} />
            ) : hasError ? (
              <Text type="danger" strong>Error</Text>
            ) : (
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
            )}
            <Text strong>Process Steps</Text>
          </div>
        }
        placement="right"
        onClose={() => setShowStatusPanel(false)}
        open={showStatusPanel && (statusUpdates.length > 0 || loading)}
        width={400}
        closable={true}
      >
        {currentUrl && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>Current URL: </Text>
            <Text code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{currentUrl}</Text>
          </div>
        )}

        {statusUpdates.length > 0 ? (
          <Timeline
            items={statusUpdates.map((update) => {
              const isSuccess = update.step.includes('complete') || 
                               update.step.includes('found') || 
                               update.step.includes('verified') ||
                               update.step.includes('ready');
              const isError = update.step.includes('error');
              
              return {
                color: isError ? 'red' : isSuccess ? 'green' : 'blue',
                dot: isSuccess ? <CheckCircleOutlined style={{ fontSize: '12px' }} /> : 
                     isError ? <Text style={{ color: 'red', fontSize: '12px' }}>✕</Text> :
                     <ClockCircleOutlined style={{ fontSize: '12px' }} />,
                children: (
                  <div style={{ marginBottom: '12px' }}>
                    <Text style={{ fontSize: '13px', lineHeight: '1.5' }}>{update.message}</Text>
                    {update.url && update.url !== currentUrl && (
                      <div style={{ marginTop: '6px' }}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>URL: </Text>
                        <Text code style={{ fontSize: '11px' }}>{update.url.substring(0, 60)}...</Text>
                      </div>
                    )}
                    <Tag 
                      color={isError ? 'error' : isSuccess ? 'success' : 'processing'} 
                      style={{ marginTop: '6px', fontSize: '11px' }}
                    >
                      {update.step.replace(/_/g, ' ')}
                    </Tag>
                  </div>
                )
              };
            })}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" tip="Waiting for updates..." />
          </div>
        )}

        {!loading && statusUpdates.length > 0 && (
          <div style={{ 
            marginTop: '16px', 
            paddingTop: '16px', 
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center'
          }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {statusUpdates.length} step{statusUpdates.length !== 1 ? 's' : ''} {hasError ? 'with errors' : 'completed'}
            </Text>
          </div>
        )}
      </Drawer>
    </>
  );
};
