import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { assessmentRoutes } from './routes/assessments.js';
import { resultsRoutes } from './routes/results.js';
import { benchmarkRoutes } from './routes/benchmarks.js';
import { actionPlanRoutes } from './routes/action-plans.js';
import { reportRoutes } from './routes/reports.js';
import { exportsRoutes } from './routes/exports.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { researchRoutes } from './routes/research.js';
import { researchApiRoutes } from './routes/researchApi.js';
import { researchAuth } from './middleware/researchAuth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { auditLog } from './middleware/auditLog.js';
import { cleanupExpiredData, getRetentionPolicy } from './middleware/dataRetention.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');

// ----- Trust proxy (Railway, Render, etc. run behind reverse proxies) -----
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);

  // HTTPS redirect
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Middleware: Helmet with hardened security headers
app.use(helmet({
  // Strict-Transport-Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  // Content-Security-Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  // Additional headers
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));

if (IS_PRODUCTION) {
  // In production, frontend is served from the same origin — no CORS needed
} else {
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));
}
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));

// ----- Rate limiting: general API -----
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ----- Rate limiting: research workspace (higher limit for exploratory analysis) -----
const researchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/research', researchLimiter);

// ----- Rate limiting: resume endpoint (brute-force protection) -----
// Stricter limit: 5 attempts per 15 minutes per IP
const resumeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many resume attempts. Please try again later.',
  },
});
app.use('/api/assessments/resume', resumeRateLimiter);

// ----- Audit logging middleware for data access routes -----
app.use('/api/assessments', auditLog);
app.use('/api/dashboard', auditLog);
app.use('/api/benchmarks', auditLog);
app.use('/api/research', auditLog);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ----- Data retention policy info endpoint -----
app.get('/api/data-retention/policy', (_req, res) => {
  res.json({ success: true, data: getRetentionPolicy() });
});

// ----- Data retention cleanup endpoint (should be called by a cron/scheduler) -----
app.post('/api/data-retention/cleanup', async (_req, res, next) => {
  try {
    const result = await cleanupExpiredData();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/api/assessments', assessmentRoutes);
app.use('/api/assessments', resultsRoutes);
app.use('/api/benchmarks', benchmarkRoutes);
app.use('/api/assessments', actionPlanRoutes);
app.use('/api/assessments', reportRoutes);
app.use('/api/assessments', exportsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/research', researchAuth, researchRoutes);

// ----- Versioned Research API (Phase 6D) -----
const researchApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/research', researchApiLimiter, researchApiRoutes);

// ----- Production: serve frontend static build -----
if (IS_PRODUCTION) {
  app.use(express.static(FRONTEND_DIST));

  // SPA catch-all: serve index.html for non-API routes
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`WISEShift API running on http://localhost:${PORT}`);
  if (IS_PRODUCTION) {
    console.log('Production mode: HTTPS enforcement and HSTS enabled');
  }
});

export default app;
