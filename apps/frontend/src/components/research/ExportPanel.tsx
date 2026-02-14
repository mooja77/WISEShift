import { useState } from 'react';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

type CitationFormat = 'apa' | 'harvard' | 'chicago';

export default function ExportPanel() {
  const [citationFormat, setCitationFormat] = useState<CitationFormat>('apa');
  const [citation, setCitation] = useState('');
  const [loadingCitation, setLoadingCitation] = useState(false);

  const downloadDataset = async (format: 'csv' | 'json') => {
    try {
      const res = await researchApi.exportDataset(format);
      const blob = new Blob([typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wiseshift-dataset.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Dataset downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to download dataset');
    }
  };

  const downloadDataDictionary = async () => {
    try {
      const res = await researchApi.exportDataDictionary();
      const entries = res.data.data;
      const headers = ['Variable', 'Type', 'Description', 'Values'];
      const rows = entries.map((e: any) => [e.variable, e.type, `"${e.description}"`, `"${e.values}"`]);
      const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wiseshift-data-dictionary.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data dictionary downloaded');
    } catch {
      toast.error('Failed to download data dictionary');
    }
  };

  const downloadCodebook = async () => {
    try {
      const res = await researchApi.exportEnhancedCodebook();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enhanced-codebook.docx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Enhanced codebook downloaded');
    } catch {
      toast.error('Failed to download codebook');
    }
  };

  const getCitation = async () => {
    setLoadingCitation(true);
    try {
      const res = await researchApi.getCitation(citationFormat);
      setCitation(res.data.data.citation);
    } catch {
      toast.error('Failed to generate citation');
    } finally {
      setLoadingCitation(false);
    }
  };

  const copyCitation = () => {
    navigator.clipboard.writeText(citation);
    toast.success('Citation copied');
  };

  return (
    <div className="space-y-6">
      {/* Dataset Export */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dataset Export</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Download the full anonymised quantitative dataset for analysis in R, SPSS, Python, or Excel.
        </p>
        <div className="mt-4 flex gap-3">
          <button onClick={() => downloadDataset('csv')} className="btn-primary">
            Download CSV
          </button>
          <button onClick={() => downloadDataset('json')} className="btn-secondary">
            Download JSON
          </button>
        </div>
      </div>

      {/* Data Dictionary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Dictionary</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Variable definitions, types, and valid value ranges for the dataset.
        </p>
        <button onClick={downloadDataDictionary} className="btn-secondary mt-4">
          Download Data Dictionary (CSV)
        </button>
      </div>

      {/* Enhanced Codebook */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Enhanced Codebook</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Your tags, descriptions, and example quotes exported as a formatted Word document for your methodology section.
        </p>
        <button onClick={downloadCodebook} className="btn-secondary mt-4">
          Download Codebook (DOCX)
        </button>
      </div>

      {/* Citations */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Formatted Citation</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Generate a citation for the WISEShift dataset in your preferred format.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div>
            <label className="label">Format</label>
            <select
              value={citationFormat}
              onChange={e => setCitationFormat(e.target.value as CitationFormat)}
              className="input mt-1"
            >
              <option value="apa">APA 7th Edition</option>
              <option value="harvard">Harvard</option>
              <option value="chicago">Chicago</option>
            </select>
          </div>
          <button onClick={getCitation} disabled={loadingCitation} className="btn-primary">
            {loadingCitation ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {citation && (
          <div className="mt-4">
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">{citation}</p>
            </div>
            <button onClick={copyCitation} className="btn-secondary mt-2 text-sm">
              Copy Citation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
