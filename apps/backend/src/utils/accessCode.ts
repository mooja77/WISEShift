import { nanoid } from 'nanoid';
import { hashAccessCode } from './hashing.js';

// Generate access codes like WISE-A7X9K2
export function generateAccessCodePlaintext(): string {
  const id = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return `WISE-${id}`;
}

export function generateDashboardCodePlaintext(): string {
  const id = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return `DASH-${id}`;
}

/**
 * Generate a new organisation access code with hashes for secure storage.
 * The plaintext is shown to the user once and never stored.
 */
export async function generateAccessCode(): Promise<{
  plaintext: string;
  sha256Index: string;
  bcryptHash: string;
}> {
  const plaintext = generateAccessCodePlaintext();
  const { sha256Index, bcryptHash } = await hashAccessCode(plaintext);
  return { plaintext, sha256Index, bcryptHash };
}

/**
 * Generate a new dashboard access code with hashes for secure storage.
 */
export async function generateDashboardCode(): Promise<{
  plaintext: string;
  sha256Index: string;
  bcryptHash: string;
}> {
  const plaintext = generateDashboardCodePlaintext();
  const { sha256Index, bcryptHash } = await hashAccessCode(plaintext);
  return { plaintext, sha256Index, bcryptHash };
}
