// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StrengthsWeaknessesProps {
  /** Domain names identified as strengths. */
  strengths: string[];
  /** Domain names identified as areas for development. */
  weaknesses: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StrengthsWeaknesses({
  strengths,
  weaknesses,
}: StrengthsWeaknessesProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {/* ── Strengths column ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="bg-green-50 border-b border-green-100 px-5 py-3 dark:bg-green-900/20 dark:border-green-800">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Strengths</h3>
        </div>

        {/* Items */}
        <ul className="divide-y divide-gray-100 dark:divide-gray-700 px-5">
          {strengths.length > 0 ? (
            strengths.map((name) => (
              <li
                key={name}
                className="flex items-center gap-3 py-3 text-sm text-gray-700 dark:text-gray-300"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500"
                  aria-hidden="true"
                />
                {name}
              </li>
            ))
          ) : (
            <li className="py-4 text-sm italic text-gray-400">
              No strengths identified.
            </li>
          )}
        </ul>
      </div>

      {/* ── Weaknesses column ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 dark:bg-amber-900/20 dark:border-amber-800">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Areas for Development
          </h3>
        </div>

        {/* Items */}
        <ul className="divide-y divide-gray-100 dark:divide-gray-700 px-5">
          {weaknesses.length > 0 ? (
            weaknesses.map((name) => (
              <li
                key={name}
                className="flex items-center gap-3 py-3 text-sm text-gray-700 dark:text-gray-300"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500"
                  aria-hidden="true"
                />
                {name}
              </li>
            ))
          ) : (
            <li className="py-4 text-sm italic text-gray-400">
              No development areas identified.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default StrengthsWeaknesses;
