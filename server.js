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

// ✅ CORS configuration - Updated to include both production and development origins
const allowedOrigins = [
  process.env.CORS_ORIGIN,                    // production frontend (Vercel)
  'https://tribhuwan-pulse-i763.vercel.app',  // explicit production URL
  'http://localhost:3000',                    // React dev server
  'http://localhost:5173',                    // Vite dev server
  'http://127.0.0.1:3000',                    // Alternative localhost
  'http://127.0.0.1:5173',                    // Alternative localhost
].filter(Boolean);

// Debug logging (remove in production)
console.log('🔍 Allowed CORS Origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS allowed for origin:', origin);
      return callback(null, true);
    }
    
    console.log('❌ CORS blocked for origin:', origin);
    return callback(new Error(`CORS blocked: ${origin} not allowed`));
  },
  credentials: true, // allow cookies / auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ Handle preflight requests globally
app.options('*', cors());

// ---------------- Security middlewares ----------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(xssClean());
app.use(mongoSanitize());
app.use(morgan('dev'));

// ---------------- Static Files ----------------
// Add CORP header for static uploads (different in dev vs prod)
app.use('/uploads', (req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const corpPolicy = isDev ? 'cross-origin' : 'same-site';

  res.setHeader('Cross-Origin-Resource-Policy', corpPolicy);

  // Keep CORS headers too for safety
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  console.log(`📁 Static file request from origin: ${origin} (CORP: ${corpPolicy})`);
  next();
});

// Serve uploads folder
app.use('/uploads', express.static('uploads'));

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
app.get('/health', (_req, res) => res.json({ 
  status: 'ok',
  cors_origins: allowedOrigins,
  timestamp: new Date().toISOString()
}));

// ---------------- Error Handling ----------------
// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Unhandled Error:', err.message);
  
  // Handle CORS errors specifically
  if (err.message.includes('CORS blocked')) {
    return res.status(403).json({ 
      message: 'CORS Error: Origin not allowed',
      origin: req.headers.origin,
      allowedOrigins: allowedOrigins
    });
  }

  res.status(500).json({ message: 'Internal Server Error' });
});

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 CORS enabled for origins:`, allowedOrigins);
    });
  } catch (err) {
    console.error('❌ Failed to connect DB:', err.message);
    process.exit(1);
  }
})();
