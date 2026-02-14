import { useEffect, useState } from 'react';
import { collaborationApi } from '../../services/api';

interface CollaboratorBadgeProps {
  assessmentId: string;
  domainKey: string;
}

interface StatusEntry {
  domainKey: string;
  claimedBy: string;
}

export default function CollaboratorBadge({ assessmentId, domainKey }: CollaboratorBadgeProps) {
  const [workers, setWorkers] = useState<string[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await collaborationApi.getStatus(assessmentId);
        const statuses: StatusEntry[] = res.data.data || [];
        const domainWorkers = statuses
          .filter((s) => s.domainKey === domainKey && s.claimedBy)
          .map((s) => s.claimedBy);
        setWorkers([...new Set(domainWorkers)]);
      } catch {
        // ignore
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [assessmentId, domainKey]);

  if (workers.length === 0) return null;

  return (
    <span className="ml-1 inline-flex items-center rounded-full bg-purple-50 px-1.5 py-0.5 text-[9px] font-medium text-purple-700 ring-1 ring-inset ring-purple-200">
      {workers.join(', ')}
    </span>
  );
}
