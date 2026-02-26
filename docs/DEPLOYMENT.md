# WISEShift Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL (production) or SQLite (development)
- Railway account (recommended) or any Node.js hosting

## Local Development

```bash
# Install dependencies
npm ci

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run database migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start development servers
npm run dev
# Backend: http://localhost:3006
# Frontend: http://localhost:5173
```

## Production Build

```bash
# Build all packages (shared → backend → frontend)
npm run build

# Start production server
npm start
# Backend serves frontend static files from same origin
```

## Railway Deployment

### 1. Create Railway Project

- Connect your GitHub repository
- Railway will auto-detect `nixpacks.toml`

### 2. Configure Environment Variables

Set these in Railway's Variables tab (see `.env.production.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (use Railway's PostgreSQL plugin) |
| `NODE_ENV` | Yes | Set to `production` |
| `JWT_SECRET` | Yes | Random 64-char hex string |
| `ADMIN_SECRET` | Yes | Random 64-char hex string |
| `FRONTEND_URL` | Yes | Your production URL |
| `ALLOWED_ORIGINS` | Yes | Your production URL |
| `PORT` | No | Railway sets this automatically |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Add PostgreSQL

- Add Railway's PostgreSQL plugin
- `DATABASE_URL` will be auto-populated

### 4. Deploy

Railway auto-deploys on push to `master`. The build pipeline:

1. `npm ci` — install dependencies
2. `npm run build` — compile shared → backend → frontend
3. `prisma migrate deploy` — run database migrations
4. `npm run db:seed` — seed benchmarks (idempotent)
5. `node dist/index.js` — start server

### 5. Health Check

Configure Railway's health check to `GET /api/health`.

## Custom Domain

1. Add custom domain in Railway settings
2. Update `FRONTEND_URL` and `ALLOWED_ORIGINS` environment variables
3. HTTPS is handled automatically by Railway

## Monitoring

- **Health endpoint**: `GET /api/health` returns `{ status: "ok", timestamp: "..." }`
- **Structured logs**: JSON format via Pino in production
- **Request tracing**: Every response includes `X-Request-ID` header
- **Audit trail**: `GET /api/admin/audit-log` (requires admin token)

## Database Backup

Railway PostgreSQL includes automated daily backups. For manual backups:

```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

## Admin Operations

All admin endpoints require `Authorization: Bearer <ADMIN_SECRET>` header.

| Endpoint | Description |
|----------|-------------|
| `GET /api/admin/researchers` | List researcher accounts |
| `PUT /api/admin/researchers/:id/access-level` | Approve/deny researcher |
| `GET /api/admin/audit-log` | Export audit trail |
| `GET /api/admin/consent-records` | Export consent records |
| `GET /api/admin/data-integrity` | Run data integrity check |
| `GET /api/admin/ethics-report` | Generate ethics DOCX report |
| `POST /api/data-retention/cleanup` | Run GDPR data cleanup |
