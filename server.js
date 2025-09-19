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

// ---------------- Security & Middleware ----------------
app.use(helmet());

// ✅ CORS configuration
const allowedOrigins = [
  process.env.CORS_ORIGIN,        // production frontend
  'http://localhost:3000',        // React dev server
  'http://localhost:5173'         // Vite dev server
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman / curl
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin} not allowed`));
  },
  credentials: true, // allow cookies / auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Handle preflight requests globally
app.options('*', cors());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(xssClean());
app.use(mongoSanitize());
app.use(morgan('dev'));

// ---------------- Static Files ----------------
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ---------------- Rate Limiting ----------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use('/api/auth', authLimiter);
app.use('/api/suggestions', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ---------------- Routes ----------------
app.use(routes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ---------------- Error Handling ----------------
// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect DB:', err.message);
    process.exit(1);
  }
})();
