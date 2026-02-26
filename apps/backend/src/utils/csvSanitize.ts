/**
 * Escape a value for CSV output with formula injection protection.
 * Values starting with =, +, -, @, \t, \r are prefixed with ' to prevent
 * spreadsheet formula injection attacks.
 */
export function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Prevent CSV formula injection (=, +, -, @, \t, \r at start)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
