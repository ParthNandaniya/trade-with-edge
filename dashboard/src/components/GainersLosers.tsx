import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Typography, Space, Spin, Alert, Tag, Row, Col, Button, message } from 'antd';
import { ReloadOutlined, ArrowUpOutlined, ArrowDownOutlined, CopyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const API_URL = 'http://localhost:3001/api/gainers-losers';

interface StockData {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string;
  volume: string;
}

interface GainersLosersData {
  metadata: string;
  last_updated: string;
  top_gainers: StockData[];
  top_losers: StockData[];
  most_actively_traded: StockData[];
}

interface ApiResponse {
  success: boolean;
  data?: GainersLosersData;
  error?: string;
  message?: string;
}

const STORAGE_KEY = 'gainers-losers-data';
const STORAGE_TIMESTAMP_KEY = 'gainers-losers-timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const GainersLosers = () => {
  // Load from localStorage on mount
  const loadCachedData = (): GainersLosersData | null => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp, 10);
        if (age < CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
    }
    return null;
  };

  const [data, setData] = useState<GainersLosersData | null>(() => loadCachedData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to fetch data');
      }

      if (result.data) {
        setData(result.data);
        setError(null); // Clear error only on successful fetch
        // Cache the data
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
          localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
        } catch (storageErr) {
          console.warn('Failed to cache data:', storageErr);
        }
      } else {
        throw new Error('No data received from API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching gainers and losers:', err);
      // Don't clear data on error - keep showing previous data
    } finally {
      setLoading(false);
    }
  }, []);

  const copyTicker = async (ticker: string) => {
    try {
      await navigator.clipboard.writeText(ticker);
      message.success(`Copied ${ticker} to clipboard`);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = ticker;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        message.success(`Copied ${ticker} to clipboard`);
      } catch (fallbackErr) {
        message.error('Failed to copy ticker');
      }
      document.body.removeChild(textArea);
    }
  };

  useEffect(() => {
    // Fetch data on mount, but show cached data immediately if available
    fetchData();
  }, [fetchData]);

  const formatNumber = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  };

  const formatPrice = (price: string): string => {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    return num.toFixed(2);
  };

  const getChangeColor = (changePercentage: string): string => {
    const num = parseFloat(changePercentage.replace('%', ''));
    if (isNaN(num)) return '';
    return num >= 0 ? '#52c41a' : '#ff4d4f';
  };

  const gainersColumns = [
    {
      title: 'Ticker',
      dataIndex: 'ticker',
      key: 'ticker',
      render: (text: string) => (
        <Space>
          <Text strong>{text}</Text>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyTicker(text)}
            style={{ padding: '0 4px' }}
            title={`Copy ${text}`}
          />
        </Space>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (text: string) => `$${formatPrice(text)}`,
    },
    {
      title: 'Change',
      dataIndex: 'change_amount',
      key: 'change_amount',
      render: (text: string, record: StockData) => (
        <Space>
          <Tag color={getChangeColor(record.change_percentage)} icon={<ArrowUpOutlined />}>
            ${formatPrice(text)}
          </Tag>
          <Text style={{ color: getChangeColor(record.change_percentage) }}>
            {record.change_percentage}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Volume',
      dataIndex: 'volume',
      key: 'volume',
      render: (text: string) => formatNumber(text),
    },
  ];

  const losersColumns = [
    {
      title: 'Ticker',
      dataIndex: 'ticker',
      key: 'ticker',
      render: (text: string) => (
        <Space>
          <Text strong>{text}</Text>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copyTicker(text)}
            style={{ padding: '0 4px' }}
            title={`Copy ${text}`}
          />
        </Space>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (text: string) => `$${formatPrice(text)}`,
    },
    {
      title: 'Change',
      dataIndex: 'change_amount',
      key: 'change_amount',
      render: (text: string, record: StockData) => (
        <Space>
          <Tag color={getChangeColor(record.change_percentage)} icon={<ArrowDownOutlined />}>
            ${formatPrice(text)}
          </Tag>
          <Text style={{ color: getChangeColor(record.change_percentage) }}>
            {record.change_percentage}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Volume',
      dataIndex: 'volume',
      key: 'volume',
      render: (text: string) => formatNumber(text),
    },
  ];

  if (loading && !data) {
    return (
      <Card>
        <Spin size="large" tip="Loading market data..." />
      </Card>
    );
  }

  if (!data && error) {
    return (
      <Card>
        <Alert
          message="Error Loading Data"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchData} icon={<ReloadOutlined />}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {error && (
        <Alert
          message="Error Refreshing Data"
          description={error}
          type="warning"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '16px' }}
        />
      )}
      <Card>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Top Gainers & Losers
              </Title>
              {data.last_updated && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Last updated: {data.last_updated}
                </Text>
              )}
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
              type="primary"
            >
              Refresh
            </Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ArrowUpOutlined style={{ color: '#52c41a' }} />
                <Text strong>Top Gainers</Text>
              </Space>
            }
            extra={<Tag color="green">{data.top_gainers.length} stocks</Tag>}
          >
            <Table
              dataSource={data.top_gainers}
              columns={gainersColumns}
              rowKey="ticker"
              pagination={false}
              size="small"
              loading={loading && !data}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                <Text strong>Top Losers</Text>
              </Space>
            }
            extra={<Tag color="red">{data.top_losers.length} stocks</Tag>}
          >
            <Table
              dataSource={data.top_losers}
              columns={losersColumns}
              rowKey="ticker"
              pagination={false}
              size="small"
              loading={loading && !data}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

