import { useResearchStore } from '../../stores/researchStore';

const TABS = [
  { key: 'explorer' as const, label: 'Explorer' },
  { key: 'heatmap' as const, label: 'Heatmap' },
  { key: 'quotes' as const, label: 'Quotes' },
  { key: 'comparison' as const, label: 'Comparison' },
  { key: 'statistics' as const, label: 'Statistics' },
  { key: 'sampling' as const, label: 'Sampling' },
  { key: 'irr' as const, label: 'IRR' },
  { key: 'trends' as const, label: 'Trends' },
  { key: 'layers' as const, label: 'Layers' },
  { key: 'exports' as const, label: 'Exports' },
  { key: 'canvas' as const, label: 'Coding Canvas' },
] as const;

export default function ResearchTabs() {
  const { activeTab, setActiveTab } = useResearchStore();

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex overflow-x-auto scrollbar-hide" aria-label="Research workspace tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors shrink-0 ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
