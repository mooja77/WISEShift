import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchStore } from '../stores/researchStore';
import { dashboardApi } from '../services/api';
import { useTour } from '../hooks/useTour';
import { researchTourSteps } from '../config/tourSteps';
import ResearchTabs from '../components/research/ResearchTabs';
import NarrativeExplorer from '../components/research/NarrativeExplorer';
import ThemeHeatmap from '../components/research/ThemeHeatmap';
import QuoteBoard from '../components/research/QuoteBoard';
import ResearchComparison from '../components/research/ResearchComparison';
import StatisticalDashboard from '../components/research/StatisticalDashboard';
import SamplingAssistant from '../components/research/SamplingAssistant';
import IRRPanel from '../components/research/IRRPanel';
import TrendsPanel from '../components/research/TrendsPanel';
import ExportPanel from '../components/research/ExportPanel';
import LayerManager from '../components/research/LayerManager';
import MemoJournal from '../components/research/MemoJournal';
import CrossCaseMatrix from '../components/research/CrossCaseMatrix';
import LongitudinalTracker from '../components/research/LongitudinalTracker';
import CooccurrenceMatrix from '../components/research/CooccurrenceMatrix';
import WordFrequencyPanel from '../components/research/WordFrequencyPanel';
import QueryBuilder from '../components/research/QueryBuilder';
import ConceptMapView from '../components/research/ConceptMapView';
import toast from 'react-hot-toast';

export default function ResearchPage() {
  const navigate = useNavigate();
  const { authenticated, activeTab, setAuth, clearAuth } = useResearchStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { hasSeenTour, startTour } = useTour('research', researchTourSteps);

  useEffect(() => {
    if (authenticated && !hasSeenTour) {
      const timeout = setTimeout(startTour, 500);
      return () => clearTimeout(timeout);
    }
  }, [authenticated, hasSeenTour, startTour]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dashboardApi.auth(code.trim());
      setAuth(code.trim());
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        toast.error('Invalid or expired dashboard access code');
      } else {
        toast.error('Unable to connect to the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 px-4 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="w-full max-w-md card">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Research Workspace</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Qualitative analysis tools for WISE assessment narratives. Enter your dashboard access code to begin.
            </p>
          </div>
          <form onSubmit={handleAuth} className="mt-6 space-y-4">
            <div>
              <label htmlFor="researchCode" className="label">Dashboard Access Code</label>
              <input
                id="researchCode"
                type="text"
                className="input mt-1 text-center font-mono text-lg tracking-wider"
                placeholder="DASH-XXXXXXXX"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading || !code.trim()} className="btn-primary w-full">
              {loading ? 'Authenticating...' : 'Open Research Workspace'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => navigate('/')} className="text-sm text-brand-600 hover:text-brand-800 dark:text-brand-400">
              Back to Home
            </button>
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              Want to explore? Try: <code className="font-mono font-bold">DASH-DEMO2025</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Research Workspace</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Qualitative & quantitative analysis tools</p>
          </div>
          <button
            onClick={() => { clearAuth(); navigate('/'); }}
            className="btn-secondary text-sm"
          >
            Exit Research
          </button>
        </div>

        {/* Tabs */}
        <ResearchTabs />

        {/* Tab content */}
        <div className="mt-6" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'explorer' && <NarrativeExplorer />}
          {activeTab === 'wordcloud' && <WordFrequencyPanel />}
          {activeTab === 'queries' && <QueryBuilder />}
          {activeTab === 'heatmap' && <ThemeHeatmap />}
          {activeTab === 'cooccurrence' && <CooccurrenceMatrix />}
          {activeTab === 'matrix' && <CrossCaseMatrix />}
          {activeTab === 'comparison' && <ResearchComparison />}
          {activeTab === 'quotes' && <QuoteBoard />}
          {activeTab === 'statistics' && <StatisticalDashboard />}
          {activeTab === 'sampling' && <SamplingAssistant />}
          {activeTab === 'irr' && <IRRPanel />}
          {activeTab === 'trends' && <TrendsPanel />}
          {activeTab === 'longitudinal' && <LongitudinalTracker />}
          {activeTab === 'layers' && <LayerManager />}
          {activeTab === 'memos' && <MemoJournal />}
          {activeTab === 'conceptmap' && <ConceptMapView />}
          {activeTab === 'exports' && <ExportPanel />}
        </div>
      </div>
    </div>
  );
}
