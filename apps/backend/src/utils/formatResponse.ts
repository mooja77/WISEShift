import type { Response } from 'express';

/**
 * Sends data as JSON or CSV based on ?format= query parameter.
 * Defaults to JSON.
 */
export function sendFormatted(
  res: Response,
  data: Record<string, any>[],
  format: string | undefined,
  filename: string
): void {
  if (format === 'csv') {
    if (data.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send('');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val == null) return '';
          const str = String(val);
          // Escape commas and quotes
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csvRows.join('\n'));
  } else {
    res.json({ success: true, data });
  }
}
