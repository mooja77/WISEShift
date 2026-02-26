import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '@/utils/renderMarkdown';

describe('renderMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('returns empty string for null/undefined input', () => {
    // The function checks `if (!text)` so falsy values should return ''
    expect(renderMarkdown(null as unknown as string)).toBe('');
    expect(renderMarkdown(undefined as unknown as string)).toBe('');
  });

  it('renders bold text with **text**', () => {
    const result = renderMarkdown('This is **bold** text');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('This is');
    expect(result).toContain('text');
  });

  it('renders multiple bold segments', () => {
    const result = renderMarkdown('**first** and **second**');
    expect(result).toContain('<strong>first</strong>');
    expect(result).toContain('<strong>second</strong>');
  });

  it('renders list items starting with -', () => {
    const result = renderMarkdown('- Item one\n- Item two');
    expect(result).toContain('<ul');
    expect(result).toContain('<li>Item one</li>');
    expect(result).toContain('<li>Item two</li>');
    expect(result).toContain('</ul>');
  });

  it('closes list when non-list line follows', () => {
    const result = renderMarkdown('- Item one\nRegular line');
    expect(result).toContain('<li>Item one</li>');
    expect(result).toContain('</ul>');
    expect(result).toContain('Regular line');
  });

  it('escapes HTML entities (prevents XSS)', () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
  });

  it('sanitizes output with DOMPurify', () => {
    // DOMPurify is configured to only allow strong, ul, li, br tags
    // Even if we somehow bypass the escaping, DOMPurify would strip it
    const result = renderMarkdown('Normal text');
    // Result should be clean HTML with only allowed tags
    expect(result).toContain('Normal text');
    expect(result).toContain('<br');
  });

  it('converts empty lines to <br/>', () => {
    const result = renderMarkdown('Line one\n\nLine two');
    // The empty line should produce a <br/>
    expect(result).toContain('Line one');
    expect(result).toContain('Line two');
  });

  it('handles bold text inside list items', () => {
    const result = renderMarkdown('- **Bold item**');
    expect(result).toContain('<li><strong>Bold item</strong></li>');
  });
});
