import { ThemeConfig, theme } from 'antd'

const { defaultAlgorithm, darkAlgorithm } = theme

// Base theme tokens
const baseTheme: ThemeConfig = {
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
      headerHeight: 64,
      headerPadding: '0 24px',
    },
  },
}

// Light theme configuration
export const lightTheme: ThemeConfig = {
  ...baseTheme,
  algorithm: defaultAlgorithm,
  components: {
    ...baseTheme.components,
    Layout: {
      ...baseTheme.components?.Layout,
      headerBg: '#001529',
      bodyBg: '#f0f2f5',
    },
  },
}

// Dark theme configuration
export const darkTheme: ThemeConfig = {
  ...baseTheme,
  algorithm: darkAlgorithm,
  components: {
    ...baseTheme.components,
    Layout: {
      ...baseTheme.components?.Layout,
      headerBg: '#141414',
      bodyBg: '#000000',
    },
  },
}

// Default export (light theme for backward compatibility)
export const antdTheme = lightTheme

