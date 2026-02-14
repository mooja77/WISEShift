import { useRef, type RefObject } from 'react';
import { exportChartSVG, exportChartPNG } from '../../utils/chartExport';

interface ChartExportToolbarProps {
  containerRef: RefObject<HTMLElement | null>;
  filenameBase?: string;
}

export default function ChartExportToolbar({ containerRef, filenameBase = 'chart' }: ChartExportToolbarProps) {
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

  return (
    <div className="flex gap-1">
      <button
        onClick={handleSVG}
        className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        title="Export as SVG"
      >
        SVG
      </button>
      <button
        onClick={handlePNG}
        className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        title="Export as PNG (2x)"
      >
        PNG
      </button>
    </div>
  );
}
