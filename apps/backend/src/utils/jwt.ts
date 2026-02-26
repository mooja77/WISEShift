import jwt from 'jsonwebtoken';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production');
}
const JWT_SECRET = process.env.JWT_SECRET || 'wiseshift-dev-secret-only';
const JWT_EXPIRY = '24h';

interface JwtPayload {
  accountId: string;
  role: string;
}

/**
 * Sign a JWT for a researcher.
 */
export function signResearcherToken(accountId: string, role: string): string {
  return jwt.sign({ accountId, role } satisfies JwtPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

/**
 * Verify a researcher JWT. Returns payload or null if invalid/expired.
 */
export function verifyResearcherToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (payload.accountId && payload.role) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}
