import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { requireAdmin } from '../../middleware/adminAuth.js';

/**
 * Tests for the requireAdmin middleware.
 * This middleware checks the Authorization: Bearer <ADMIN_SECRET> header
 * using timing-safe comparison.
 */

function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/admin-test', requireAdmin, (_req, res) => {
    res.json({ success: true, message: 'admin access granted' });
  });
  return app;
}

describe('requireAdmin middleware', () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.ADMIN_SECRET;
    process.env.ADMIN_SECRET = 'test-admin-secret-123';
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.ADMIN_SECRET = originalSecret;
    } else {
      delete process.env.ADMIN_SECRET;
    }
  });

  it('returns 401 when no auth header is provided', async () => {
    const app = createApp();
    const res = await request(app).get('/admin-test');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: 'Invalid admin token',
    });
  });

  it('returns 401 when wrong token is provided', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/admin-test')
      .set('Authorization', 'Bearer wrong-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: 'Invalid admin token',
    });
  });

  it('passes when correct token matches ADMIN_SECRET env var', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/admin-test')
      .set('Authorization', 'Bearer test-admin-secret-123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'admin access granted',
    });
  });

  it('returns 401 when ADMIN_SECRET is not set', async () => {
    delete process.env.ADMIN_SECRET;
    const app = createApp();
    const res = await request(app)
      .get('/admin-test')
      .set('Authorization', 'Bearer any-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: 'Invalid admin token',
    });
  });
});
