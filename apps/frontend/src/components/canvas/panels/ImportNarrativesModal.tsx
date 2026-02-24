import { useState, useEffect } from 'react';
import { researchApi } from '../../../services/api';
import { useCanvasStore } from '../../../stores/canvasStore';
import toast from 'react-hot-toast';

interface Assessment {
  assessmentId: string;
  label: string;
  overallScore: number | null;
  completedAt: string;
  country: string;
  sector: string;
}

interface NarrativeResponse {
  responseId: string;
  questionText: string;
  domainKey: string;
  domainName: string;
  textValue: string;
}

interface Props {
  onClose: () => void;
}

export default function ImportNarrativesModal({ onClose }: Props) {
  const { importNarratives } = useCanvasStore();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [narratives, setNarratives] = useState<NarrativeResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingNarratives, setLoadingNarratives] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    researchApi.getAssessments()
      .then(res => setAssessments(res.data.data || []))
      .catch(() => toast.error('Failed to load assessments'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectAssessment = async (id: string) => {
    setSelectedAssessmentId(id);
    setNarratives([]);
    setSelectedIds(new Set());
    setLoadingNarratives(true);
    try {
      const res = await researchApi.searchNarratives({ assessmentId: id, pageSize: 100 } as any);
      const data = res.data.data;
      // Filter only narrative responses with text
      const results = data?.results || data?.responses || data || [];
      const narrs = results.filter((r: any) => r.textValue);
      setNarratives(narrs);
    } catch {
      toast.error('Failed to load narratives');
    } finally {
      setLoadingNarratives(false);
    }
  };

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === narratives.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(narratives.map(n => n.responseId)));
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    setImporting(true);
    try {
      await importNarratives(Array.from(selectedIds));
      toast.success(`Imported ${selectedIds.size} narrative${selectedIds.size > 1 ? 's' : ''}`);
      onClose();
    } catch {
      toast.error('Failed to import narratives');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="modal-content w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import from Assessments</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select an assessment, then choose which narrative responses to import as transcripts.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No assessments available</div>
          ) : (
            <>
              {/* Assessment selector */}
              <div className="mb-4">
                <label className="label">Assessment</label>
                <select
                  className="input mt-1"
                  value={selectedAssessmentId || ''}
                  onChange={e => handleSelectAssessment(e.target.value)}
                >
                  <option value="">Select an assessment...</option>
                  {assessments.map(a => (
                    <option key={a.assessmentId} value={a.assessmentId}>
                      {a.label} — {a.sector} ({new Date(a.completedAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Narratives list */}
              {loadingNarratives && (
                <div className="py-6 text-center text-gray-400">Loading narratives...</div>
              )}
              {!loadingNarratives && selectedAssessmentId && narratives.length === 0 && (
                <div className="py-6 text-center text-gray-400">No narrative responses in this assessment</div>
              )}
              {narratives.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={toggleAll}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {selectedIds.size === narratives.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <span className="text-xs text-gray-400">{selectedIds.size} of {narratives.length} selected</span>
                  </div>
                  {narratives.map(n => (
                    <label
                      key={n.responseId}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedIds.has(n.responseId)
                          ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(n.responseId)}
                        onChange={() => toggleId(n.responseId)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {n.domainName || n.domainKey} — {n.questionText}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
                          {n.textValue}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={handleImport}
            disabled={importing || selectedIds.size === 0}
            className="btn-primary text-sm"
          >
            {importing ? 'Importing...' : `Import ${selectedIds.size > 0 ? selectedIds.size : ''} Selected`}
          </button>
        </div>
      </div>
    </div>
  );
}
