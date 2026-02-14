import { useState, useEffect, useCallback } from 'react';
import type { QuotePin } from '@wiseshift/shared';
import { researchApi } from '../../services/api';
import QuoteCard from './QuoteCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function QuoteBoard() {
  const [quotes, setQuotes] = useState<QuotePin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      const res = await researchApi.getQuotes();
      setQuotes(res.data.data);
    } catch {
      toast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const handleDelete = async (id: string) => {
    try {
      await researchApi.deleteQuote(id);
      setQuotes(q => q.filter(p => p.id !== id));
      toast.success('Quote unpinned');
    } catch {
      toast.error('Failed to unpin quote');
    }
  };

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetIdx: number) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) return;

    const newQuotes = [...quotes];
    const [dragged] = newQuotes.splice(dragIdx, 1);
    newQuotes.splice(targetIdx, 0, dragged);
    setQuotes(newQuotes);
    setDragIdx(null);

    // Save new order
    try {
      await researchApi.reorderQuotes(newQuotes.map(q => q.id));
    } catch {
      toast.error('Failed to save order');
      fetchQuotes(); // revert
    }
  };

  const exportDocx = async () => {
    try {
      const res = await researchApi.exportQuotesDocx();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'research-quotes.docx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Quotes exported');
    } catch {
      toast.error('Failed to export quotes');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Quote Board</h2>
          <p className="text-sm text-gray-500">
            {quotes.length} pinned quote{quotes.length !== 1 ? 's' : ''}. Drag to reorder. Pin quotes from the Narrative Explorer.
          </p>
        </div>
        {quotes.length > 0 && (
          <button onClick={exportDocx} className="btn-secondary text-sm">
            Export as Word
          </button>
        )}
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">
            No pinned quotes yet. Go to the Narrative Explorer, find a quote, and click "Pin Quote".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q, idx) => (
            <QuoteCard
              key={q.id}
              quote={q}
              onDelete={handleDelete}
              draggable
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
