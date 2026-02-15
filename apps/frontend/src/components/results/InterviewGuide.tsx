import { useEffect, useState } from 'react';
import { interviewGuideApi } from '../../services/api';
import toast from 'react-hot-toast';

interface InterviewQuestion {
  domainKey: string;
  domainName: string;
  type: 'development' | 'strength' | 'elaboration';
  question: string;
  rationale: string;
}

interface InterviewGuideProps {
  assessmentId: string;
}

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  development: { label: 'Area for development', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  strength: { label: 'Strength to explore', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  elaboration: { label: 'Needs more detail', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
};

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function InterviewGuide({ assessmentId }: InterviewGuideProps) {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const res = await interviewGuideApi.get(assessmentId);
        setQuestions(res.data.data || []);
      } catch {
        // Silently fail — optional feature
      } finally {
        setLoading(false);
      }
    };
    fetchGuide();
  }, [assessmentId]);

  const handleCopyAll = () => {
    const text = questions
      .map(
        (q) =>
          `[${TYPE_BADGES[q.type]?.label || q.type}] ${q.domainName}\n${q.question}\nRationale: ${q.rationale}`
      )
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast.success('Interview questions copied to clipboard');
  };

  const handleExportDocx = async () => {
    try {
      const res = await interviewGuideApi.getDocx(assessmentId);
      downloadBlob(new Blob([res.data]), `wiseshift-interview-guide-${assessmentId}.docx`);
      toast.success('Interview guide downloaded');
    } catch {
      toast.error('Failed to export interview guide');
    }
  };

  if (loading || questions.length === 0) return null;

  // Group by domain
  const grouped = new Map<string, InterviewQuestion[]>();
  for (const q of questions) {
    const existing = grouped.get(q.domainName) || [];
    existing.push(q);
    grouped.set(q.domainName, existing);
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Follow-Up Interview Guide</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Suggested interview questions generated from your assessment results,
            designed for follow-up qualitative research.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={handleCopyAll} className="btn-secondary text-xs">
            Copy All
          </button>
          <button onClick={handleExportDocx} className="btn-secondary text-xs">
            Export as Word
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {Array.from(grouped).map(([domainName, domainQuestions]) => (
          <div key={domainName}>
            <h3 className="mb-3 text-sm font-bold text-gray-800 dark:text-gray-200">{domainName}</h3>
            <div className="space-y-3">
              {domainQuestions.map((q, idx) => {
                const badge = TYPE_BADGES[q.type] || TYPE_BADGES.elaboration;
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{q.question}</p>
                    <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">{q.rationale}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
