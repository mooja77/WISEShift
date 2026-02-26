/**
 * Chart export utilities — SVG and PNG export from Recharts containers.
 * No npm dependencies — uses native browser APIs.
 */

/** Export a Recharts container element as SVG string */
export function exportChartSVG(containerEl: HTMLElement, filename = 'chart.svg'): void {
  const svg = containerEl.querySelector('svg');
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  downloadBlob(blob, filename);
}

/** Export a Recharts container element as PNG (2x resolution for print) */
export function exportChartPNG(containerEl: HTMLElement, filename = 'chart.png', scale = 2): void {
  const svg = containerEl.querySelector('svg');
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob(blob => {
      if (blob) downloadBlob(blob, filename);
    }, 'image/png');
  };
  img.src = url;
}

/** Export a Recharts container element as high-DPI PNG for print/journal submission */
export function exportChartPNGHighDPI(containerEl: HTMLElement, filename = 'chart-300dpi.png', dpi = 300): void {
  const scale = dpi / 96;
  exportChartPNG(containerEl, filename, scale);
}

/** Convert a CSS color to greyscale using luminance formula */
export function colorToGreyscale(color: string): string {
  // Named color map (common Tailwind/Recharts palette)
  const NAMED_COLORS: Record<string, string> = {
    red: '#ff0000', blue: '#0000ff', green: '#008000', yellow: '#ffff00',
    orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', cyan: '#00ffff',
    magenta: '#ff00ff', white: '#ffffff', black: '#000000', gray: '#808080',
    grey: '#808080', indigo: '#4b0082', teal: '#008080', lime: '#00ff00',
    coral: '#ff7f50', salmon: '#fa8072', tomato: '#ff6347', gold: '#ffd700',
    silver: '#c0c0c0', navy: '#000080', maroon: '#800000', olive: '#808000',
    aqua: '#00ffff', violet: '#ee82ee', crimson: '#dc143c', chocolate: '#d2691e',
  };

  let r: number, g: number, b: number;

  if (color.startsWith('#')) {
    // Hex color
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (color.startsWith('rgb')) {
    // rgb() or rgba()
    const match = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!match) return color;
    r = parseInt(match[1]);
    g = parseInt(match[2]);
    b = parseInt(match[3]);
  } else {
    // Named color
    const hex = NAMED_COLORS[color.toLowerCase()];
    if (!hex) return color;
    return colorToGreyscale(hex);
  }

  // Luminance formula: 0.299*R + 0.587*G + 0.114*B
  const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const greyHex = grey.toString(16).padStart(2, '0');
  return `#${greyHex}${greyHex}${greyHex}`;
}

/** Export a Recharts container element as greyscale SVG for journal submissions */
export function exportChartSVGGreyscale(containerEl: HTMLElement, filename = 'chart-greyscale.svg'): void {
  const svg = containerEl.querySelector('svg');
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Convert all fill and stroke attributes to greyscale
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const fill = el.getAttribute('fill');
    if (fill && fill !== 'none' && fill !== 'transparent') {
      el.setAttribute('fill', colorToGreyscale(fill));
    }
    const stroke = el.getAttribute('stroke');
    if (stroke && stroke !== 'none' && stroke !== 'transparent') {
      el.setAttribute('stroke', colorToGreyscale(stroke));
    }
    // Also handle inline style fill/stroke
    const style = el.getAttribute('style');
    if (style) {
      const updated = style
        .replace(/fill:\s*([^;]+)/g, (_, c) => `fill: ${colorToGreyscale(c.trim())}`)
        .replace(/stroke:\s*([^;]+)/g, (_, c) => `stroke: ${colorToGreyscale(c.trim())}`);
      el.setAttribute('style', updated);
    }
  });

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  downloadBlob(blob, filename);
}

/** Generate an APA-style figure caption */
export function generateAPACaption(figureNumber: number, title: string, description?: string): string {
  let caption = `Figure ${figureNumber}. ${title}`;
  if (description) {
    caption += ` ${description}`;
  }
  // Ensure caption ends with a period
  if (!caption.endsWith('.')) caption += '.';
  return caption;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
