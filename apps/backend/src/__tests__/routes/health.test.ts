import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

/**
 * Tests for the GET /api/health endpoint.
 * This endpoint returns a simple health check response.
 *
 * We import the full Express app to test the route as wired.
 * NODE_ENV=test prevents app.listen() from firing.
 */

// Set required env vars before importing app
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test.db';
});

describe('GET /api/health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const { default: app } = await import('../../index.js');

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    // Verify timestamp is a valid ISO string
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});
