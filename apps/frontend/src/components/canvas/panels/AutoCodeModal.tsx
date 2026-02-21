import { useState } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { CanvasQuestion, CanvasTranscript } from '@wiseshift/shared';
import toast from 'react-hot-toast';

interface AutoCodeModalProps {
  onClose: () => void;
}

export default function AutoCodeModal({ onClose }: AutoCodeModalProps) {
  const { activeCanvas, autoCode } = useCanvasStore();
  const [pattern, setPattern] = useState('');
  const [mode, setMode] = useState<'keyword' | 'regex'>('keyword');
  const [questionId, setQuestionId] = useState('');
  const [transcriptIds, setTranscriptIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const questions = activeCanvas?.questions ?? [];
  const transcripts = activeCanvas?.transcripts ?? [];

  const handleSubmit = async () => {
    if (!pattern.trim() || !questionId) return;
    setLoading(true);
    try {
      const result = await autoCode(questionId, pattern.trim(), mode, transcriptIds.length ? transcriptIds : undefined);
      toast.success(`Auto-coded ${result.created} match${result.created !== 1 ? 'es' : ''}`);
      onClose();
    } catch {
      toast.error('Auto-coding failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleTranscript = (tid: string) => {
    setTranscriptIds(prev => prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Auto-Code by Pattern</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Pattern input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Search Pattern</label>
            <input
              type="text"
              className="input w-full text-sm"
              placeholder={mode === 'regex' ? 'e.g. sustainab(le|ility)' : 'e.g. sustainability'}
              value={pattern}
              onChange={e => setPattern(e.target.value)}
            />
          </div>

          {/* Mode toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Match Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('keyword')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === 'keyword' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
              >
                Keyword
              </button>
              <button
                onClick={() => setMode('regex')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === 'regex' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
              >
                Regex
              </button>
            </div>
          </div>

          {/* Question selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Assign to Question</label>
            <select className="input w-full text-sm" value={questionId} onChange={e => setQuestionId(e.target.value)}>
              <option value="">Select a question...</option>
              {questions.map((q: CanvasQuestion) => (
                <option key={q.id} value={q.id}>{q.text}</option>
              ))}
            </select>
          </div>

          {/* Transcript selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transcripts <span className="text-gray-400 font-normal">(all if none selected)</span>
            </label>
            <div className="max-h-[120px] overflow-y-auto rounded border border-gray-200 p-2 dark:border-gray-700 space-y-1">
              {transcripts.map((t: CanvasTranscript) => (
                <label key={t.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={transcriptIds.includes(t.id)}
                    onChange={() => toggleTranscript(t.id)}
                    className="rounded border-gray-300"
                  />
                  {t.title}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary h-8 px-3 text-xs">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!pattern.trim() || !questionId || loading}
            className="btn-primary h-8 px-3 text-xs disabled:opacity-50"
          >
            {loading ? 'Coding...' : 'Auto-Code'}
          </button>
        </div>
      </div>
    </div>
  );
}
