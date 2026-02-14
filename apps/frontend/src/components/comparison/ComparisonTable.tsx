import type { CrossCaseComparison } from '@wiseshift/shared';
import { DOMAINS } from '@wiseshift/shared';
import { formatScore } from '../../utils/locale';

interface ComparisonTableProps {
  assessments: CrossCaseComparison[];
}

export default function ComparisonTable({ assessments }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
              Domain
            </th>
            {assessments.map((a) => (
              <th
                key={a.assessmentId}
                className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500"
              >
                {a.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {/* Overall */}
          <tr className="bg-gray-50 font-semibold">
            <td className="px-4 py-2 text-sm">Overall Score</td>
            {assessments.map((a) => (
              <td
                key={a.assessmentId}
                className="px-4 py-2 text-center text-sm font-bold"
              >
                {formatScore(a.overallScore)}/5
              </td>
            ))}
          </tr>
          {/* Domain rows */}
          {DOMAINS.map((domain) => (
            <tr key={domain.key}>
              <td className="px-4 py-2 text-sm text-gray-700">{domain.name}</td>
              {assessments.map((a) => {
                const ds = a.domainScores.find(
                  (s) => s.domainKey === domain.key
                );
                return (
                  <td
                    key={a.assessmentId}
                    className="px-4 py-2 text-center text-sm"
                  >
                    <span className="font-medium">
                      {ds ? formatScore(ds.score) : '-'}
                    </span>
                    {ds && (
                      <span className="ml-1 text-xs text-gray-400">
                        {ds.maturityLevel}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
