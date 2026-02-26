import { useState, useEffect, useCallback } from 'react';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface SaturationPoint {
  caseIndex: number;
  caseId: string;
  newCodes: number;
  cumulativeCodes: number;
}

interface SaturationData {
  saturationCurve: SaturationPoint[];
  totalCases: number;
  totalUniqueCodes: number;
  saturationIndex: number;
  interpretation: string;
}

export default function SaturationTracker() {
  const [data, setData] = useState<SaturationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await researchApi.getSaturation();
        setData(res.data.data);
      } catch {
        toast.error('Failed to load saturation data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleExportReport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await researchApi.exportSaturationReport();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `saturation-report-${dateStr}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Saturation report downloaded');
    } catch {
      toast.error('Failed to export saturation report');
    } finally {
      setExporting(false);
    }
  }, []);

  if (loading) return <div className="text-center text-gray-500 dark:text-gray-400 py-4">Loading saturation data...</div>;
  if (!data) return (
    <div className="card">
      <div className="rounded-lg bg-amber-50 p-4 text-center dark:bg-amber-900/20">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Unable to load saturation data. Code some narratives first, or try refreshing the page.
        </p>
      </div>
    </div>
  );

  const maxNew = Math.max(1, ...data.saturationCurve.map(p => p.newCodes));
  const maxCumulative = Math.max(1, ...data.saturationCurve.map(p => p.cumulativeCodes));

  const saturationColor = data.saturationIndex >= 80
    ? 'text-green-600 dark:text-green-400'
    : data.saturationIndex >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  const saturationBg = data.saturationIndex >= 80
    ? 'bg-green-100 dark:bg-green-900'
    : data.saturationIndex >= 50
      ? 'bg-amber-100 dark:bg-amber-900'
      : 'bg-red-100 dark:bg-red-900';

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Saturation Tracker</h3>
        <button
          onClick={handleExportReport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export publication-ready saturation report as DOCX"
        >
          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
          {exporting ? 'Exporting...' : 'Export Report'}
        </button>
      </div>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Tracks new codes introduced per case. A flattening curve indicates theoretical saturation.
      </p>

      {/* Summary stats */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cases Coded</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalCases}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Unique Codes</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{data.totalUniqueCodes}</p>
        </div>
        <div className={`rounded-lg p-4 text-center ${saturationBg}`}>
          <p className="text-sm text-gray-500 dark:text-gray-400">Saturation Index</p>
          <p className={`mt-1 text-2xl font-bold ${saturationColor}`}>{data.saturationIndex}%</p>
        </div>
      </div>

      {/* Interpretation */}
      <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
        <p className="text-sm text-gray-700 dark:text-gray-300">{data.interpretation}</p>
      </div>

      {/* Visual bar chart */}
      {data.saturationCurve.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">New Codes Per Case</p>
          <div className="space-y-1">
            {data.saturationCurve.map(point => (
              <div key={point.caseIndex} className="flex items-center gap-2">
                <span className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right shrink-0">
                  Case {point.caseIndex}
                </span>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className={`h-5 rounded transition-all ${point.newCodes === 0 ? 'bg-green-300 dark:bg-green-700' : 'bg-brand-500 dark:bg-brand-400'}`}
                    style={{ width: `${Math.max(2, (point.newCodes / maxNew) * 100)}%` }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">
                    {point.newCodes === 0 ? '0 new' : `+${point.newCodes}`}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 w-12 text-right shrink-0">
                  {point.cumulativeCodes} total
                </span>
              </div>
            ))}
          </div>

          {/* Cumulative line visualization */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Cumulative Code Growth</p>
            <div className="h-32 flex items-end gap-px">
              {data.saturationCurve.map(point => (
                <div
                  key={point.caseIndex}
                  className="flex-1 bg-brand-200 dark:bg-brand-700 rounded-t transition-all hover:bg-brand-300 dark:hover:bg-brand-600"
                  style={{ height: `${(point.cumulativeCodes / maxCumulative) * 100}%` }}
                  title={`Case ${point.caseIndex}: ${point.cumulativeCodes} total codes`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">Case 1</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">Case {data.totalCases}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        Saturation index: percentage of recent cases (last 25%) that introduced zero new codes.
        80%+ = strong saturation signal. Based on Guest et al. (2006) approach.
      </div>
    </div>
  );
}
