# Trade With Edge - Backend Server

Node.js backend server for the trade-with-edge dashboard.

## Features

- Screenshot API endpoint to capture website screenshots
- CORS enabled for frontend communication
- TypeScript support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### GET /api/screenshot

Takes a screenshot of a Finviz stock quote page and returns it as a base64 encoded image.

**Query Parameters:**
- `ticker` (required): The stock ticker symbol (e.g., RAIN, AAPL, TSLA)

**Example Request:**
```
GET /api/screenshot?ticker=RAIN
```

**Response:**
```json
{
  "success": true,
  "image": "data:image/png;base64,...",
  "ticker": "RAIN",
  "url": "https://finviz.com/quote.ashx?t=RAIN",
  "selector": "table.snapshot-table2",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Notes:**
- The API automatically constructs the Finviz URL: `https://finviz.com/quote.ashx?t={TICKER}`
- The screenshot captures the main snapshot table (selector: `table.snapshot-table2`)
- The selector can be customized in `server/src/routes/screenshot.ts`

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Example Frontend Usage

```typescript
const takeScreenshot = async (ticker: string) => {
  const response = await fetch(`http://localhost:3001/api/screenshot?ticker=${ticker}`, {
    method: 'GET',
  });
  
  const data = await response.json();
  return data.image; // base64 encoded image
};

// Usage
const imageData = await takeScreenshot('RAIN');
```

## Port

Default port: 3001 (can be changed via PORT environment variable)
