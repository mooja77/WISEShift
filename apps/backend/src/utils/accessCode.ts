import { nanoid } from 'nanoid';

// Generate access codes like WISE-A7X9K2
export function generateAccessCode(): string {
  const id = nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return `WISE-${id}`;
}

export function generateDashboardCode(): string {
  const id = nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  return `DASH-${id}`;
}
