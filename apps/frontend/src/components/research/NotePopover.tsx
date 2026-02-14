import { useState, useEffect, useRef } from 'react';
import { researchApi } from '../../services/api';
import toast from 'react-hot-toast';

interface Props {
  responseId: string;
  hasNote: boolean;
}

export default function NotePopover({ responseId, hasNote }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Load existing note on open
  useEffect(() => {
    if (open && !loaded) {
      researchApi.getNote(responseId)
        .then(res => {
          if (res.data.data) {
            setText(res.data.data.text);
          }
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
  }, [open, loaded, responseId]);

  const handleSave = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await researchApi.upsertNote({ responseId, text: text.trim() });
      toast.success('Note saved');
      setOpen(false);
    } catch {
      toast.error('Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await researchApi.deleteNote(responseId);
      setText('');
      toast.success('Note deleted');
      setOpen(false);
    } catch {
      toast.error('Failed to delete note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`text-xs ${hasNote ? 'text-brand-600' : 'text-gray-500'} hover:text-brand-700`}
        title={hasNote ? 'Edit note' : 'Add note'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 inline h-3.5 w-3.5" fill={hasNote ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        {hasNote ? 'Note' : 'Add Note'}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a researcher note..."
            className="input w-full text-xs"
            rows={3}
            maxLength={5000}
          />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={handleSave} disabled={loading || !text.trim()} className="btn-primary text-xs py-1 px-3">
              {loading ? 'Saving...' : 'Save'}
            </button>
            {hasNote && (
              <button onClick={handleDelete} disabled={loading} className="text-xs text-red-600 hover:text-red-800">
                Delete
              </button>
            )}
            <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
