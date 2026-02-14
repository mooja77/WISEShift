/**
 * Minimal markdown renderer for narrative text.
 * Supports: **bold**, lines starting with `- ` as list items, newlines as <br/>.
 * No external dependency required.
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    // Escape HTML entities
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold: **text**
    const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // List item: lines starting with "- "
    if (withBold.startsWith('- ')) {
      if (!inList) {
        result.push('<ul class="list-disc pl-5 space-y-1">');
        inList = true;
      }
      result.push(`<li>${withBold.slice(2)}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (withBold.trim() === '') {
        result.push('<br/>');
      } else {
        result.push(`${withBold}<br/>`);
      }
    }
  }

  if (inList) {
    result.push('</ul>');
  }

  return result.join('');
}
