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

// Deduplicate simultaneous requests for the same assessment
const pendingRequests = new Map<string, Promise<StatusEntry[]>>();
const cachedResults = new Map<string, { data: StatusEntry[]; timestamp: number }>();
const CACHE_TTL = 10000; // 10 seconds

async function fetchStatusOnce(assessmentId: string): Promise<StatusEntry[]> {
  // Return cached result if fresh
  const cached = cachedResults.get(assessmentId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Deduplicate in-flight requests
  const pending = pendingRequests.get(assessmentId);
  if (pending) return pending;

  const promise = collaborationApi
    .getStatus(assessmentId)
    .then((res) => {
      const data: StatusEntry[] = res.data.data || [];
      cachedResults.set(assessmentId, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      pendingRequests.delete(assessmentId);
    });

  pendingRequests.set(assessmentId, promise);
  return promise;
}

export default function CollaboratorBadge({ assessmentId, domainKey }: CollaboratorBadgeProps) {
  const [workers, setWorkers] = useState<string[]>([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const statuses = await fetchStatusOnce(assessmentId);
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
