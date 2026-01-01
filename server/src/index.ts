import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { screenshotRouter } from './routes/screenshot.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server default port
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📸 Screenshot API available at http://localhost:${PORT}/api/screenshot`);
});
