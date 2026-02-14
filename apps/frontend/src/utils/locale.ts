// Detect user's locale from browser, default to 'en-GB' for EU
export function getUserLocale(): string {
  const browserLocale = navigator.language || 'en-GB';
  return browserLocale;
}

// Format date in EU style (DD/MM/YYYY or locale-appropriate)
export function formatDate(date: string | Date, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale || getUserLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Format number with locale-appropriate decimal separator
export function formatNumber(num: number, decimals: number = 1, locale?: string): string {
  return num.toLocaleString(locale || getUserLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Format score (e.g., "3,2" in French, "3.2" in English)
export function formatScore(score: number, locale?: string): string {
  return formatNumber(score, 1, locale);
}
