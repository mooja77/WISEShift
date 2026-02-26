# Database Migration: SQLite → PostgreSQL

WISEShift uses SQLite for development and PostgreSQL for production. This guide covers the migration.

## 1. Update Prisma Schema

In `apps/backend/prisma/schema.prisma`, change the datasource:

```prisma
datasource db {
  provider = "postgresql"    // was "sqlite"
  url      = env("DATABASE_URL")
}
```

## 2. Update DATABASE_URL

SQLite format:
```
DATABASE_URL="file:./dev.db"
```

PostgreSQL format:
```
DATABASE_URL="postgresql://user:password@host:5432/wiseshift?schema=public"
```

## 3. Generate New Migration Baseline

```bash
# Reset migrations for PostgreSQL
rm -rf apps/backend/prisma/migrations

# Create initial PostgreSQL migration
cd apps/backend
npx prisma migrate dev --name init_postgresql
```

## 4. Data Migration (if needed)

If you have existing data in SQLite that needs to be preserved:

```bash
# Export from SQLite
sqlite3 apps/backend/prisma/dev.db .dump > sqlite_dump.sql

# Manual conversion needed:
# - SQLite uses INTEGER for booleans, PostgreSQL uses BOOLEAN
# - SQLite AUTOINCREMENT → PostgreSQL SERIAL/CUID
# - DateTime format differences
# - Text type differences (SQLite has no varchar length limits)
```

For fresh deployments, simply run `npm run db:seed` after migration.

## 5. Query Compatibility Notes

| Feature | SQLite | PostgreSQL | Action |
|---------|--------|------------|--------|
| Case-insensitive search | `mode: 'insensitive'` (Prisma extension) | Native `ILIKE` (Prisma handles automatically) | No change needed |
| JSON fields | Stored as TEXT | Native JSONB supported | Consider using `Json` type |
| Boolean | Stored as 0/1 | Native BOOLEAN | Prisma handles automatically |
| DateTime | TEXT (ISO string) | Native TIMESTAMP | Prisma handles automatically |

## 6. Railway PostgreSQL Setup

1. Add PostgreSQL plugin in Railway dashboard
2. `DATABASE_URL` is automatically set
3. Run `prisma migrate deploy` (handled by nixpacks.toml build step)
4. Seed data: `npm run db:seed`

## 7. Connection Pooling

For production with multiple concurrent users, configure connection pooling in `apps/backend/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings (PostgreSQL only)
  // Prisma defaults: pool_timeout=10s, connection_limit=num_cpus*2+1
});
```

For Railway, the default connection pool is usually sufficient. For high-traffic scenarios, consider using PgBouncer.
