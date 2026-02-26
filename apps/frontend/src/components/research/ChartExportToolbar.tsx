import { type RefObject } from 'react';
import { exportChartSVG, exportChartPNG, exportChartPNGHighDPI, exportChartSVGGreyscale, generateAPACaption } from '../../utils/chartExport';

interface ChartExportToolbarProps {
  containerRef: RefObject<HTMLElement | null>;
  filenameBase?: string;
  figureNumber?: number;
  figureTitle?: string;
}

export default function ChartExportToolbar({ containerRef, filenameBase = 'chart', figureNumber, figureTitle }: ChartExportToolbarProps) {
  const btnClass = 'rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200';

  const handleSVG = () => {
    if (containerRef.current) {
      exportChartSVG(containerRef.current, `${filenameBase}.svg`);
    }
  };

  const handlePNG = () => {
    if (containerRef.current) {
      exportChartPNG(containerRef.current, `${filenameBase}.png`);
    }
  };

  const handlePNG300 = () => {
    if (containerRef.current) {
      exportChartPNGHighDPI(containerRef.current, `${filenameBase}-300dpi.png`, 300);
    }
  };

  const handleGreyscaleSVG = () => {
    if (containerRef.current) {
      exportChartSVGGreyscale(containerRef.current, `${filenameBase}-greyscale.svg`);
    }
  };

  const apaCaption = figureNumber && figureTitle
    ? generateAPACaption(figureNumber, figureTitle)
    : null;

  return (
    <div>
      <div className="flex gap-1">
        <button onClick={handleSVG} className={btnClass} title="Export as SVG">
          SVG
        </button>
        <button onClick={handlePNG} className={btnClass} title="Export as PNG (2x)">
          PNG
        </button>
        <button onClick={handlePNG300} className={btnClass} title="Export as PNG (300 DPI for print)">
          PNG 300 DPI
        </button>
        <button onClick={handleGreyscaleSVG} className={btnClass} title="Export as greyscale SVG (for journals)">
          Greyscale SVG
        </button>
      </div>
      {apaCaption && (
        <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">{apaCaption}</p>
      )}
    </div>
  );
}
