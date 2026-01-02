import { useState, useEffect, useRef } from 'react';
import { Button, Card, Image, Spin, message, Space, Typography, Modal, Timeline, Tag, Drawer, Row, Col, Divider, Badge, Collapse, AutoComplete } from 'antd';
import { ReloadOutlined, DownloadOutlined, LoadingOutlined, CheckCircleOutlined, ClockCircleOutlined, HistoryOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const API_STREAM_URL = 'http://localhost:3001/api/screenshot/stream';
const TICKER_SEARCH_URL = 'http://localhost:3001/api/ticker/search';

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

interface AlphaVantageNewsData {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface AlphaVantageTradingData {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface AlphaVantageData {
  news?: AlphaVantageNewsData;
  trading?: AlphaVantageTradingData;
}

interface TickerSearchResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: number;
}

interface TickerSearchResponse {
  success: boolean;
  keywords: string;
  count: number;
  results: TickerSearchResult[];
  error?: string;
  message?: string;
}

export const Screenshot = () => {
  const [ticker, setTicker] = useState('');
  const [screenshots, setScreenshots] = useState<ScreenshotResult[]>([]);
  const [alphaVantageData, setAlphaVantageData] = useState<AlphaVantageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showNewsJsonPreview, setShowNewsJsonPreview] = useState(true);
  const [showTradingJsonPreview, setShowTradingJsonPreview] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  
  // Ticker search state
  const [searchValue, setSearchValue] = useState('');
  const [searchOptions, setSearchOptions] = useState<Array<{ value: string; label: JSX.Element }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getFilename = (screenshot: ScreenshotResult): string => {
    const symbol = ticker.toUpperCase();
    // Custom filename based on screenshot source and variant
    if (screenshot.name === 'finviz') {
      return `${symbol}_data.png`;
    } else if (screenshot.name === 'tradingview') {
      // Differentiate between TradingView variants
      if (screenshot.variant) {
        return `${symbol}_${screenshot.variant}_chart.png`;
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

  const downloadNewsJson = () => {
    if (!alphaVantageData?.news?.data) {
      message.error('No news data available to download');
      return;
    }

    const jsonString = JSON.stringify(alphaVantageData.news.data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ticker.toUpperCase()}_news_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('News data downloaded successfully!');
  };

  const downloadTradingJson = () => {
    if (!alphaVantageData?.trading?.data) {
      message.error('No trading data available to download');
      return;
    }

    const jsonString = JSON.stringify(alphaVantageData.trading.data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ticker.toUpperCase()}_trading_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success('Trading data downloaded successfully!');
  };

  const downloadAllFiles = () => {
    if (!ticker) {
      message.warning('No ticker selected');
      return;
    }

    const delay = 200; // Delay between downloads to avoid browser blocking

    // Download all screenshots
    const screenshotCount = screenshots.filter(s => s.success && s.image).length;
    screenshots.forEach((screenshot, index) => {
      if (screenshot.success && screenshot.image) {
        setTimeout(() => {
          downloadScreenshot(screenshot);
        }, index * delay);
      }
    });

    let currentDelay = screenshotCount * delay;

    // Download news JSON if available
    if (alphaVantageData?.news?.success && alphaVantageData.news.data) {
      setTimeout(() => {
        downloadNewsJson();
      }, currentDelay);
      currentDelay += delay;
    }

    // Download trading JSON if available
    if (alphaVantageData?.trading?.success && alphaVantageData.trading.data) {
      setTimeout(() => {
        downloadTradingJson();
      }, currentDelay);
      currentDelay += delay;
    }

    const totalFiles = screenshotCount + 
      (alphaVantageData?.news?.success && alphaVantageData.news.data ? 1 : 0) +
      (alphaVantageData?.trading?.success && alphaVantageData.trading.data ? 1 : 0);

    if (totalFiles === 0) {
      message.warning('No files available to download');
      return;
    }

    setTimeout(() => {
      message.success(`Downloading ${totalFiles} file${totalFiles !== 1 ? 's' : ''}...`);
    }, 100);
  };

  const showTickerNotFoundAlert = () => {
    Modal.error({
      title: 'Ticker Symbol Not Found',
      content: `The ticker symbol "${ticker.toUpperCase()}" was not found. Please check the symbol and try again.`,
      okText: 'OK',
    });
  };

  // Search for ticker symbols
  const searchTicker = async (value: string) => {
    if (!value || value.trim().length < 2) {
      setSearchOptions([]);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search requests
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await fetch(`${TICKER_SEARCH_URL}?keywords=${encodeURIComponent(value.trim())}`);
        const data: TickerSearchResponse = await response.json();

        if (data.success && data.results && data.results.length > 0) {
          const options = data.results.map((result) => ({
            value: result.symbol,
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: '14px' }}>{result.symbol}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>{result.name}</Text>
                </div>
                <Tag color="blue" style={{ marginLeft: '8px' }}>{result.currency}</Tag>
              </div>
            ),
            result: result
          }));
          setSearchOptions(options);
        } else {
          setSearchOptions([]);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error searching for ticker:', errorMessage);
        setSearchOptions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300); // 300ms debounce
  };

  // Handle ticker selection from search - automatically trigger screenshot
  const handleTickerSelect = (value: string) => {
    const tickerValue = value.toUpperCase();
    setTicker(tickerValue);
    setSearchValue(tickerValue); // Keep the selected value visible
    setSearchOptions([]);
    // Automatically trigger screenshot with the selected ticker
    takeScreenshot(tickerValue);
  };

  // Handle manual ticker entry via Enter key in search
  const handleSearchEnter = () => {
    if (searchValue && searchValue.trim().length > 0) {
      const tickerValue = searchValue.trim().toUpperCase();
      setTicker(tickerValue);
      setSearchValue(tickerValue);
      setSearchOptions([]);
      // Automatically trigger screenshot with the entered ticker
      takeScreenshot(tickerValue);
    }
  };

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Auto-scroll timeline to bottom when new status updates arrive
  useEffect(() => {
    if (timelineRef.current && statusUpdates.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const timelineContainer = timelineRef.current;
        if (timelineContainer) {
          timelineContainer.scrollTop = timelineContainer.scrollHeight;
        }
      }, 100);
    }
  }, [statusUpdates]);

  // Count failed steps
  const failedStepsCount = statusUpdates.filter(update => 
    update.step.includes('error') || update.step.includes('failed') || update.success === false
  ).length;

  const takeScreenshot = (tickerOverride?: string) => {
    const tickerToUse = tickerOverride || ticker;
    if (!tickerToUse || tickerToUse.trim() === '') {
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

    const tickerUpper = tickerToUse.trim().toUpperCase();
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
      setAlphaVantageData(data.alphaVantage || null);
      setLoading(false);
      setHasError(!data.success);
      
      const successCount = data.screenshots?.filter((s: ScreenshotResult) => s.success).length || 0;
      const totalCount = data.screenshots?.length || 0;
      
      if (data.success) {
        message.success(`Screenshots captured for ${data.ticker}! (${successCount}/${totalCount} successful)`);
        const hasNews = data.alphaVantage?.news?.success;
        const hasTrading = data.alphaVantage?.trading?.success;
        if (hasNews || hasTrading) {
          const dataTypes = [];
          if (hasNews) dataTypes.push('news');
          if (hasTrading) dataTypes.push('trading');
          message.success(`Alpha Vantage ${dataTypes.join(' & ')} data fetched successfully`);
        }
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
            failedStepsCount > 0 ? (
              <Badge 
                count={failedStepsCount} 
                offset={[8, 0]}
              >
                <Button
                  type="text"
                  icon={<HistoryOutlined />}
                  onClick={() => setShowStatusPanel(true)}
                  size="small"
                >
                  View Steps
                </Button>
              </Badge>
            ) : (
              <Button
                type="text"
                icon={<HistoryOutlined />}
                onClick={() => setShowStatusPanel(true)}
                size="small"
              >
                View Steps
              </Button>
            )
          )}
        </div>
        
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={12} lg={10} xl={8}>
            <div>
              <Text type="secondary" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                Search for US stocks or enter ticker symbol
              </Text>
              <AutoComplete
                style={{ width: '100%' }}
                placeholder="Search ticker symbol or company name (e.g., Apple, AAPL, Tesla) - Press Enter or select from dropdown"
                value={searchValue}
                options={searchOptions}
                onSearch={searchTicker}
                onSelect={handleTickerSelect}
                onChange={(value) => setSearchValue(value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchValue && searchValue.trim().length > 0) {
                    handleSearchEnter();
                  }
                }}
                notFoundContent={searchLoading ? <Spin size="small" /> : searchValue.length >= 2 ? 'No US stocks found' : 'Type at least 2 characters to search'}
                allowClear
                filterOption={false}
                disabled={loading}
                suffixIcon={searchLoading ? <LoadingOutlined /> : loading ? <LoadingOutlined /> : <SearchOutlined />}
              />
              {ticker && (
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Current ticker: <Text strong>{ticker}</Text>
                    {loading && <Spin size="small" style={{ marginLeft: '8px' }} />}
                  </Text>
                </div>
              )}
            </div>
          </Col>
          <Col xs={24} sm={24} md={12} lg={14} xl={16} style={{ marginBottom: 5 }}>
            {(successfulScreenshots.length > 0 || 
              (alphaVantageData?.news?.success && alphaVantageData.news.data) ||
              (alphaVantageData?.trading?.success && alphaVantageData.trading.data)) && 
              !loading && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                minHeight: '32px'
              }}>
                <Space size="small">
                  {(successfulScreenshots.length > 0 || 
                    (alphaVantageData?.news?.success && alphaVantageData.news.data) ||
                    (alphaVantageData?.trading?.success && alphaVantageData.trading.data)) && (
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={downloadAllFiles}
                    >
                      Download All Files
                    </Button>
                  )}
                  {screenshots.length > 0 && (
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => takeScreenshot()}
                      loading={loading}
                    >
                      Refetch All Screenshots
                    </Button>
                  )}
                </Space>
              </div>
            )}
          </Col>
        </Row>

        {successfulScreenshots.length > 0 && !loading && (
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0 }}>
                  Screenshots ({successfulScreenshots.length}/{screenshots.length} successful)
                </Title>
                <Space>
                  {successfulScreenshots.length > 1 && (
                    <Button
                      type="default"
                      icon={<DownloadOutlined />}
                      onClick={downloadAllScreenshots}
                    >
                      Download Screenshots
                    </Button>
                  )}
                </Space>
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

        {/* News Data Section */}
        {alphaVantageData?.news && !loading && (
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0 }}>
                  News Sentiment Data
                  {alphaVantageData.news.success ? (
                    <Tag color="success" style={{ marginLeft: '8px' }}>Success</Tag>
                  ) : (
                    <Tag color="error" style={{ marginLeft: '8px' }}>Failed</Tag>
                  )}
                </Title>
                {alphaVantageData.news.success && alphaVantageData.news.data && (
                  <Space>
                    <Button
                      type="default"
                      icon={<EyeOutlined />}
                      onClick={() => setShowNewsJsonPreview(!showNewsJsonPreview)}
                    >
                      {showNewsJsonPreview ? 'Hide' : 'Preview'} JSON
                    </Button>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={downloadNewsJson}
                    >
                      Download JSON
                    </Button>
                  </Space>
                )}
              </div>

              {alphaVantageData.news.success && alphaVantageData.news.data ? (
                <>
                  {showNewsJsonPreview && (
                    <Collapse
                      items={[{
                        key: '1',
                        label: 'News Sentiment JSON Preview',
                        children: (
                          <pre style={{ 
                            backgroundColor: '#f5f5f5', 
                            padding: '16px', 
                            borderRadius: '4px',
                            overflow: 'auto',
                            maxHeight: '500px',
                            fontSize: '12px',
                            lineHeight: '1.5'
                          }}>
                            {JSON.stringify(alphaVantageData.news.data, null, 2)}
                          </pre>
                        )
                      }]}
                    />
                  )}
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    News sentiment data fetched successfully. Click "Preview JSON" to view or "Download JSON" to save.
                  </Text>
                </>
              ) : (
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#fff2f0', 
                  borderRadius: '4px',
                  border: '1px solid #ffccc7'
                }}>
                  <Text type="danger">
                    {alphaVantageData.news.error || 'Failed to fetch news sentiment data'}
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Trading Data Section */}
        {alphaVantageData?.trading && !loading && (
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0 }}>
                  Trading Data (Time Series)
                  {alphaVantageData.trading.success ? (
                    <Tag color="success" style={{ marginLeft: '8px' }}>Success</Tag>
                  ) : (
                    <Tag color="error" style={{ marginLeft: '8px' }}>Failed</Tag>
                  )}
                </Title>
                {alphaVantageData.trading.success && alphaVantageData.trading.data && (
                  <Space>
                    <Button
                      type="default"
                      icon={<EyeOutlined />}
                      onClick={() => setShowTradingJsonPreview(!showTradingJsonPreview)}
                    >
                      {showTradingJsonPreview ? 'Hide' : 'Preview'} JSON
                    </Button>
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={downloadTradingJson}
                    >
                      Download JSON
                    </Button>
                  </Space>
                )}
              </div>

              {alphaVantageData.trading.success && alphaVantageData.trading.data ? (
                <>
                  {showTradingJsonPreview && (
                    <Collapse
                      items={[{
                        key: '1',
                        label: 'Trading Data JSON Preview',
                        children: (
                          <pre style={{ 
                            backgroundColor: '#f5f5f5', 
                            padding: '16px', 
                            borderRadius: '4px',
                            overflow: 'auto',
                            maxHeight: '500px',
                            fontSize: '12px',
                            lineHeight: '1.5'
                          }}>
                            {JSON.stringify(alphaVantageData.trading.data, null, 2)}
                          </pre>
                        )
                      }]}
                    />
                  )}
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Trading data fetched successfully. Click "Preview JSON" to view or "Download JSON" to save.
                  </Text>
                </>
              ) : (
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#fff2f0', 
                  borderRadius: '4px',
                  border: '1px solid #ffccc7'
                }}>
                  <Text type="danger">
                    {alphaVantageData.trading.error || 'Failed to fetch trading data'}
                  </Text>
                </div>
              )}
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
          <div 
            ref={timelineRef}
            style={{ 
              maxHeight: 'calc(100vh - 200px)', 
              overflowY: 'auto',
              paddingRight: '8px'
            }}
          >
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
          </div>
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
