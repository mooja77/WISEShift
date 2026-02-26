import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signResearcherToken, verifyResearcherToken } from '../../utils/jwt.js';

/**
 * Tests for JWT utility functions (signResearcherToken, verifyResearcherToken).
 * These functions handle researcher authentication tokens.
 */

describe('JWT utilities', () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.JWT_SECRET;
    // Set a known secret for deterministic tests
    process.env.JWT_SECRET = 'test-jwt-secret-for-vitest';
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.JWT_SECRET = originalSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  describe('signResearcherToken', () => {
    it('creates a valid token string', () => {
      const token = signResearcherToken('account-123', 'researcher');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // JWT format: header.payload.signature (three dot-separated parts)
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });
  });

  describe('verifyResearcherToken', () => {
    it('returns payload for a valid token', () => {
      const token = signResearcherToken('account-456', 'admin');
      const payload = verifyResearcherToken(token);

      expect(payload).not.toBeNull();
      expect(payload!.accountId).toBe('account-456');
      expect(payload!.role).toBe('admin');
    });

    it('returns null for an invalid token', () => {
      const payload = verifyResearcherToken('this.is.not-a-valid-jwt');

      expect(payload).toBeNull();
    });

    it('returns null for a completely garbage string', () => {
      const payload = verifyResearcherToken('garbage');

      expect(payload).toBeNull();
    });

    it('returns null for an empty string', () => {
      const payload = verifyResearcherToken('');

      expect(payload).toBeNull();
    });
  });
});
