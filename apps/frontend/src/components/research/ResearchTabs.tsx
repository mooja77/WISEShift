import { useResearchStore } from '../../stores/researchStore';

// Tab groups: Explore | Analyse | Track | Organise | Export
const TABS = [
  // Explore
  { key: 'explorer' as const, label: 'Explorer', group: 'explore' },
  { key: 'wordcloud' as const, label: 'Words', group: 'explore' },
  { key: 'queries' as const, label: 'Query', group: 'explore' },
  // Analyse
  { key: 'heatmap' as const, label: 'Heatmap', group: 'analyse' },
  { key: 'cooccurrence' as const, label: 'Co-occurrence', group: 'analyse' },
  { key: 'matrix' as const, label: 'Matrix', group: 'analyse' },
  { key: 'comparison' as const, label: 'Comparison', group: 'analyse' },
  { key: 'quotes' as const, label: 'Quotes', group: 'analyse' },
  // Track
  { key: 'statistics' as const, label: 'Statistics', group: 'track' },
  { key: 'sampling' as const, label: 'Sampling', group: 'track' },
  { key: 'irr' as const, label: 'IRR', group: 'track' },
  { key: 'trends' as const, label: 'Trends', group: 'track' },
  { key: 'longitudinal' as const, label: 'Longitudinal', group: 'track' },
  // Organise
  { key: 'layers' as const, label: 'Layers', group: 'organise' },
  { key: 'memos' as const, label: 'Memos', group: 'organise' },
  { key: 'conceptmap' as const, label: 'Concept Map', group: 'organise' },
  // Export
  { key: 'exports' as const, label: 'Exports', group: 'export' },
] as const;

export default function ResearchTabs() {
  const { activeTab, setActiveTab } = useResearchStore();

  return (
    <div data-tour="research-tabs" className="border-b border-gray-200 dark:border-gray-700">
      <div className="-mb-px flex overflow-x-auto scrollbar-hide" role="tablist" aria-label="Research workspace tabs">
        {TABS.map((tab, i) => (
          <div key={tab.key} className="flex items-center shrink-0">
            {i > 0 && TABS[i - 1].group !== tab.group && (
              <div className="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
            )}
            <button
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls={`tabpanel-${tab.key}`}
              data-tour={`research-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
