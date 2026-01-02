import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { screenshotRouter } from './routes/screenshot.js';
import { tickerRouter } from './routes/ticker.js';
import { gainersLosersRouter } from './routes/gainers-losers.js';
import { config } from './config.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API routes
app.use('/api/screenshot', screenshotRouter);
app.use('/api/ticker', tickerRouter);
app.use('/api/gainers-losers', gainersLosersRouter);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Server is running on http://localhost:${config.port}`);
  console.log(`📸 Screenshot API available at http://localhost:${config.port}/api/screenshot`);
  console.log(`🔍 Ticker Search API available at http://localhost:${config.port}/api/ticker/search`);
  console.log(`📈 Gainers & Losers API available at http://localhost:${config.port}/api/gainers-losers`);
});
