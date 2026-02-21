import { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { ComputedNodeType } from '@wiseshift/shared';
import toast from 'react-hot-toast';

const NODE_OPTIONS: { type: ComputedNodeType; label: string; description: string; color: string }[] = [
  { type: 'search', label: 'Text Search', description: 'Find patterns across transcripts', color: '#059669' },
  { type: 'cooccurrence', label: 'Co-occurrence', description: 'Find overlapping codings', color: '#7C3AED' },
  { type: 'matrix', label: 'Framework Matrix', description: 'Case x Question grid', color: '#D97706' },
  { type: 'stats', label: 'Statistics', description: 'Coding frequency charts', color: '#3B82F6' },
  { type: 'comparison', label: 'Comparison', description: 'Compare transcript profiles', color: '#EC4899' },
  { type: 'wordcloud', label: 'Word Cloud', description: 'Frequency visualization', color: '#6366F1' },
  { type: 'cluster', label: 'Clustering', description: 'Group similar segments', color: '#14B8A6' },
];

export default function AddComputedNodeMenu() {
  const { addComputedNode } = useCanvasStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAdd = async (type: ComputedNodeType, label: string) => {
    try {
      await addComputedNode(type, label);
      toast.success(`${label} node added`);
      setOpen(false);
    } catch {
      toast.error('Failed to add node');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
        </svg>
        Query
        <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {NODE_OPTIONS.map(opt => (
            <button
              key={opt.type}
              onClick={() => handleAdd(opt.type, opt.label)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-750 first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: opt.color }} />
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{opt.label}</p>
                <p className="text-[10px] text-gray-400">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
