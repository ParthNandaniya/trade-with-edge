import 'dotenv/config';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { screenshotRouter } from './routes/screenshot.js';
import { tickerRouter } from './routes/ticker.js';
import { gainersLosersRouter } from './routes/gainers-losers.js';

// Initialize Firebase Admin
admin.initializeApp();

const app = express();

// CORS configuration - allow all origins in production (adjust as needed)
app.use(cors({
  origin: true,
  credentials: true
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

// Export the Express app as a Firebase Function
export const api = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540, // 9 minutes (max for HTTP functions)
    memory: '2GB' // Puppeteer needs more memory
  })
  .https.onRequest(app);

