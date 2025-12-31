import { ThemeConfig } from 'antd'

// Ant Design theme configuration
export const antdTheme: ThemeConfig = {
  token: {
    // Primary color
    colorPrimary: '#1890ff',
    
    // Border radius
    borderRadius: 6,
    
    // Font
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    
    // Spacing
    wireframe: false,
  },
  components: {
    Button: {
      borderRadius: 6,
    },
    Card: {
      borderRadius: 8,
    },
    Layout: {
      headerBg: '#001529',
      headerHeight: 64,
      headerPadding: '0 24px',
    },
  },
}

