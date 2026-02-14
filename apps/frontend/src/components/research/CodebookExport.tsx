import { useState } from 'react';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function CodebookExport() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await researchApi.exportCodebook();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'research-codebook.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Codebook exported');
    } catch {
      toast.error('Failed to export codebook');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="btn-secondary text-sm"
    >
      {exporting ? 'Exporting...' : 'Export Codebook (CSV)'}
    </button>
  );
}
