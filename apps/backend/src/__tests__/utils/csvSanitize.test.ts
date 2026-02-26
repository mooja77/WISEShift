import { describe, it, expect } from 'vitest';
import { escapeCsv } from '../../utils/csvSanitize.js';

/**
 * Tests for the escapeCsv utility function.
 * This function sanitises values for CSV export, protecting against
 * formula injection attacks in spreadsheet applications.
 */

describe('escapeCsv', () => {
  describe('normal values pass through unchanged', () => {
    it('returns plain string as-is', () => {
      expect(escapeCsv('hello world')).toBe('hello world');
    });

    it('returns numeric value as string', () => {
      expect(escapeCsv(42)).toBe('42');
    });

    it('returns zero as string', () => {
      expect(escapeCsv(0)).toBe('0');
    });
  });

  describe('null and undefined handling', () => {
    it('returns empty string for null', () => {
      expect(escapeCsv(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(escapeCsv(undefined)).toBe('');
    });
  });

  describe('values with commas get quoted', () => {
    it('wraps value containing a comma in double quotes', () => {
      expect(escapeCsv('hello, world')).toBe('"hello, world"');
    });
  });

  describe('values with double quotes get escaped', () => {
    it('escapes internal double quotes by doubling them', () => {
      expect(escapeCsv('say "hello"')).toBe('"say ""hello"""');
    });
  });

  describe('values with newlines get quoted', () => {
    it('wraps value containing a newline in double quotes', () => {
      expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
    });
  });

  describe('formula injection prevention', () => {
    it('prefixes values starting with = with apostrophe', () => {
      const result = escapeCsv('=SUM(A1:A10)');
      // After prefixing: "'=SUM(A1:A10)" — the apostrophe triggers quoting
      expect(result).toContain("'");
      expect(result).not.toMatch(/^=/);
    });

    it('prefixes values starting with + with apostrophe', () => {
      const result = escapeCsv('+cmd|stuff');
      expect(result).toContain("'");
      expect(result).not.toMatch(/^\+/);
    });

    it('prefixes values starting with - with apostrophe', () => {
      const result = escapeCsv('-cmd|stuff');
      expect(result).toContain("'");
      expect(result).not.toMatch(/^-/);
    });

    it('prefixes values starting with @ with apostrophe', () => {
      const result = escapeCsv('@SUM(A1)');
      expect(result).toContain("'");
      expect(result).not.toMatch(/^@/);
    });

    it('prefixes values starting with tab with apostrophe', () => {
      const result = escapeCsv('\tcmd');
      expect(result).toContain("'");
      expect(result).not.toMatch(/^\t/);
    });
  });
});
