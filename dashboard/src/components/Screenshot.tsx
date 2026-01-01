import { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, Image, Spin, message, Space, Typography, Modal, Timeline, Tag, Drawer, Row, Col, Divider } from 'antd';
import { CameraOutlined, ReloadOutlined, DownloadOutlined, LoadingOutlined, CheckCircleOutlined, ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const API_STREAM_URL = 'http://localhost:3001/api/screenshot/stream';

interface ScreenshotResult {
  name: string;
  variant?: string; // Optional variant to differentiate between multiple screenshots of the same source
  success: boolean;
  image?: string;
  url: string;
  selector?: string;
  error?: string;
  timestamp: string;
}

interface StatusUpdate {
  message: string;
  step: string;
  timestamp: Date;
  url?: string;
  website?: string;
  success?: boolean;
}

export const Screenshot = () => {
  const [ticker, setTicker] = useState('');
  const [screenshots, setScreenshots] = useState<ScreenshotResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [hasError, setHasError] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const getFilename = (screenshot: ScreenshotResult): string => {
    const symbol = ticker.toUpperCase();
    // Custom filename based on screenshot source and variant
    if (screenshot.name === 'finviz') {
      return `${symbol}_data.png`;
    } else if (screenshot.name === 'tradingview') {
      // Differentiate between TradingView variants
      if (screenshot.variant === 'secondary') {
        return `${symbol}_secondary_chart.png`;
      }
      // Default variant
      return `${symbol}_default_chart.png`;
    }
    // Fallback for other sources
    const variantSuffix = screenshot.variant ? `_${screenshot.variant}` : '';
    return `${symbol}_${screenshot.name}${variantSuffix}_screenshot.png`;
  };

  const downloadScreenshot = (screenshot: ScreenshotResult) => {
    if (!screenshot.image) return;

    // Extract base64 data from data URL
    const base64Data = screenshot.image.split(',')[1];
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
    link.download = getFilename(screenshot);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success(`Screenshot from ${screenshot.name} downloaded successfully!`);
  };

  const downloadAllScreenshots = () => {
    screenshots.forEach(screenshot => {
      if (screenshot.success && screenshot.image) {
        setTimeout(() => downloadScreenshot(screenshot), 100);
      }
    });
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
    setScreenshots([]);
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
        url: data.url,
        website: data.website,
        success: data.success
      }]);
      if (data.url) {
        setCurrentUrl(data.url);
      }
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setScreenshots(data.screenshots || []);
      setLoading(false);
      setHasError(!data.success);
      
      const successCount = data.screenshots?.filter((s: ScreenshotResult) => s.success).length || 0;
      const totalCount = data.screenshots?.length || 0;
      
      if (data.success) {
        message.success(`Screenshots captured for ${data.ticker}! (${successCount}/${totalCount} successful)`);
      } else {
        message.warning(`Screenshots completed with some errors for ${data.ticker} (${successCount}/${totalCount} successful)`);
      }
      
      // Auto-close panel on successful completion
      if (data.success) {
        setTimeout(() => {
          setShowStatusPanel(false);
        }, 500);
      }
      
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.addEventListener('error', (e: MessageEvent) => {
      const data = e.data ? JSON.parse(e.data) : { error: 'Unknown error', message: 'Failed to take screenshots' };
      
      setHasError(true);
      setLoading(false);
      // Keep panel open on error so user can see what went wrong
      
      if (data.error?.toLowerCase().includes('not found') || 
          data.message?.toLowerCase().includes('ticker')) {
        showTickerNotFoundAlert();
      } else {
        message.error(data.message || data.error || 'Failed to take screenshots');
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

  const successfulScreenshots = screenshots.filter(s => s.success && s.image);
  const failedScreenshots = screenshots.filter(s => !s.success);

  return (
    <>
      <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>Stock Screenshots</Title>
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
            Take Screenshots
          </Button>
        </Space.Compact>

        {successfulScreenshots.length > 0 && !loading && (
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0 }}>
                  Screenshots ({successfulScreenshots.length}/{screenshots.length} successful)
                </Title>
                {successfulScreenshots.length > 1 && (
                  <Button
                    type="default"
                    icon={<DownloadOutlined />}
                    onClick={downloadAllScreenshots}
                  >
                    Download All
                  </Button>
                )}
              </div>
              
              <Row gutter={[16, 16]}>
                {successfulScreenshots.map((screenshot, index) => (
                  <Col xs={24} sm={12} lg={8} key={index}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <Text strong style={{ textTransform: 'capitalize' }}>
                            {screenshot.name}
                            {screenshot.variant && ` (${screenshot.variant})`}
                          </Text>
                          <Tag color="success">Success</Tag>
                        </Space>
                      }
                      extra={
                        <Button
                          type="text"
                          icon={<DownloadOutlined />}
                          size="small"
                          onClick={() => downloadScreenshot(screenshot)}
                        />
                      }
                    >
                      <Image
                        src={screenshot.image}
                        alt={`Screenshot from ${screenshot.name}${screenshot.variant ? ` (${screenshot.variant})` : ''}`}
                        style={{ width: '100%', borderRadius: '4px' }}
                        preview={{
                          mask: 'Preview',
                        }}
                      />
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {new Date(screenshot.timestamp).toLocaleTimeString()}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Space>
          </Card>
        )}

        {failedScreenshots.length > 0 && !loading && (
          <Card>
            <Title level={5} style={{ margin: 0, color: '#ff4d4f' }}>
              Failed Screenshots ({failedScreenshots.length})
            </Title>
            <Divider style={{ margin: '12px 0' }} />
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {failedScreenshots.map((screenshot, index) => (
                <div key={index} style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#fff2f0', 
                  borderRadius: '4px',
                  border: '1px solid #ffccc7'
                }}>
                  <Space>
                    <Text strong style={{ textTransform: 'capitalize' }}>{screenshot.name}</Text>
                    <Tag color="error">Failed</Tag>
                  </Space>
                  {screenshot.error && (
                    <div style={{ marginTop: '4px' }}>
                      <Text type="danger" style={{ fontSize: '12px' }}>{screenshot.error}</Text>
                    </div>
                  )}
                </div>
              ))}
            </Space>
          </Card>
        )}

        {screenshots.length > 0 && !loading && (
          <div style={{ textAlign: 'center' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={takeScreenshot}
              loading={loading}
            >
              Retake All Screenshots
            </Button>
          </div>
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
            items={statusUpdates.map((update, index) => {
              const isSuccess = update.step.includes('complete') || 
                               update.step.includes('found') || 
                               update.step.includes('verified') ||
                               update.step.includes('ready') ||
                               (update.success === true);
              const isError = update.step.includes('error') || update.step.includes('failed');
              
              return {
                key: index,
                color: isError ? 'red' : isSuccess ? 'green' : 'blue',
                dot: isSuccess ? <CheckCircleOutlined style={{ fontSize: '12px' }} /> : 
                     isError ? <Text style={{ color: 'red', fontSize: '12px' }}>✕</Text> :
                     <ClockCircleOutlined style={{ fontSize: '12px' }} />,
                children: (
                  <div style={{ marginBottom: '12px' }}>
                    {update.website && (
                      <Tag color="blue" style={{ marginBottom: '4px', textTransform: 'capitalize' }}>
                        {update.website}
                      </Tag>
                    )}
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
