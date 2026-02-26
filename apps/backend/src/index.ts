import dotenv from 'dotenv';
dotenv.config();

// ─── Environment Validation ───
const IS_PROD = process.env.NODE_ENV === 'production';
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
  console.error('FATAL: DATABASE_URL environment variable is required');
  process.exit(1);
}
if (IS_PROD) {
  const required = ['JWT_SECRET', 'ADMIN_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required production env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

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
import { publicApiRoutes } from './routes/publicApi.js';
import { registryRoutes } from './routes/registry.js';
import { researcherRoutes } from './routes/researchers.js';
import { workingGroupRoutes } from './routes/workingGroups.js';
import { adminRoutes } from './routes/admin.js';
// Canvas routes removed — now in standalone Canvas App
import { consentRoutes } from './routes/consent.js';
import { researchAuth } from './middleware/researchAuth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { auditLog } from './middleware/auditLog.js';
import { requireAdmin } from './middleware/adminAuth.js';
import { csrfProtection } from './middleware/csrf.js';
import { cleanupExpiredData, getRetentionPolicy } from './middleware/dataRetention.js';
import { logger } from './lib/logger.js';
import { requestId } from './middleware/requestId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');

// ----- Request ID for tracing -----
app.use(requestId);

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
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
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

// ----- CSRF protection (Origin header validation) -----
app.use(csrfProtection);

// ----- Rate limiting -----
// Each route category gets its own limiter so they don't share a counter.
// Assessment routes need a higher limit: auto-save fires every 30s, and the
// results page alone loads ~15 endpoints (scores, exemplars×9, timeline, etc.).

const assessmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // assessment filling + results page loads
  standardHeaders: true,
  legacyHeaders: false,
});

const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const researchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,                  // exploratory analysis requires many requests
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for brute-force protection on code-based resume
const resumeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many resume attempts. Please try again later.',
  },
});

const registryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// ----- Health check (no rate limit, no audit) -----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ----- Data retention policy info endpoint -----
app.get('/api/data-retention/policy', (_req, res) => {
  res.json({ success: true, data: getRetentionPolicy() });
});

// ----- Data retention cleanup endpoint (requires admin auth) -----
app.post('/api/data-retention/cleanup', requireAdmin, async (_req, res, next) => {
  try {
    const result = await cleanupExpiredData();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ----- Consent recording -----
app.use('/api/consent', assessmentLimiter, auditLog, consentRoutes);

// ----- Assessment routes (filling, results, exports, reports, action plans) -----
// Resume has a stricter brute-force limiter applied before the general one
app.use('/api/assessments/resume', resumeRateLimiter);
app.use('/api/assessments', assessmentLimiter, auditLog, assessmentRoutes);
app.use('/api/assessments', assessmentLimiter, resultsRoutes);
app.use('/api/assessments', assessmentLimiter, actionPlanRoutes);
app.use('/api/assessments', assessmentLimiter, reportRoutes);
app.use('/api/assessments', assessmentLimiter, exportsRoutes);

// ----- Dashboard -----
app.use('/api/dashboard', dashboardLimiter, auditLog, dashboardRoutes);

// ----- Benchmarks -----
app.use('/api/benchmarks', dashboardLimiter, auditLog, benchmarkRoutes);

// ----- Research workspace (high limit for exploratory analysis) -----
app.use('/api/research', researchLimiter, auditLog, researchAuth, researchRoutes);

// ----- Versioned Research API -----
const researchApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/research', researchApiLimiter, researchApiRoutes);

// ----- Open Data Public API (no auth required) -----
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Rate limit exceeded. Please try again later.' },
});
app.use('/api/v1/public', cors(), publicApiLimiter, auditLog, publicApiRoutes);

// ----- WISE Registry -----
app.use('/api/registry', registryLimiter, auditLog, registryRoutes);

// ----- Researcher Portal (self-registration, verified auth) -----
const researcherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/researchers', researcherLimiter, auditLog, researcherRoutes);

// ----- Working Group Collaboration -----
app.use('/api/working-groups', assessmentLimiter, auditLog, workingGroupRoutes);

// ----- Admin (Bulk Import + Ethics Oversight) -----
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/admin', adminLimiter, auditLog, adminRoutes);

// ----- Production: serve frontend static build -----
if (IS_PRODUCTION) {
  app.use(express.static(FRONTEND_DIST));

  // SPA catch-all: serve index.html for non-API routes
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/') || req.path === '/api') {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Only start listening when run directly (not imported by tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'WISEShift API started');
  });
}

export default app;
