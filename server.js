const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const xssClean = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const { connectDB } = require('./config/db');
const routes = require('./routes');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();

// Security & middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(xssClean());
app.use(mongoSanitize());
app.use(morgan('dev'));

// Serve uploaded media statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Basic rate limiting for auth & create suggestion
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/auth', authLimiter);
app.use('/api/suggestions', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Routes
app.use(routes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;

(async () => {
  await connectDB(process.env.MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();