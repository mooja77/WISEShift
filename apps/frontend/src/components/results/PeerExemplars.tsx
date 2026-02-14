import { useEffect, useState } from 'react';
import { resultsApi } from '../../services/api';
import { ChevronDownIcon, ChevronUpIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface Exemplar {
  context: string;
  text: string;
}

interface PeerExemplarsProps {
  assessmentId: string;
  domainKey: string;
  domainName: string;
}

export default function PeerExemplars({ assessmentId, domainKey, domainName }: PeerExemplarsProps) {
  const [exemplars, setExemplars] = useState<Exemplar[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    resultsApi.getExemplars(assessmentId, domainKey)
      .then(res => setExemplars(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assessmentId, domainKey]);

  if (loading || exemplars.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        <UserGroupIcon className="h-4 w-4" />
        How advanced WISEs approach this ({exemplars.length})
        {expanded
          ? <ChevronUpIcon className="h-3 w-3" />
          : <ChevronDownIcon className="h-3 w-3" />
        }
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {exemplars.map((ex, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-900/20"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {ex.context}
              </p>
              <p className="mt-1.5 text-xs text-gray-700 leading-relaxed dark:text-gray-300">
                {ex.text.length > 500 ? `${ex.text.slice(0, 500)}...` : ex.text}
              </p>
            </div>
          ))}
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Anonymised responses from organisations scoring higher in {domainName}. No identifying information is shared.
          </p>
        </div>
      )}
    </div>
  );
}
