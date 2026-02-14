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

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
