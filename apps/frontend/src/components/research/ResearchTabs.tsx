import { useResearchStore } from '../../stores/researchStore';

const TABS = [
  { key: 'explorer' as const, label: 'Narrative Explorer' },
  { key: 'heatmap' as const, label: 'Theme Heatmap' },
  { key: 'quotes' as const, label: 'Quote Board' },
] as const;

export default function ResearchTabs() {
  const { activeTab, setActiveTab } = useResearchStore();

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Research workspace tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
