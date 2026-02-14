import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchStore } from '../stores/researchStore';
import { dashboardApi } from '../services/api';
import ResearchTabs from '../components/research/ResearchTabs';
import NarrativeExplorer from '../components/research/NarrativeExplorer';
import ThemeHeatmap from '../components/research/ThemeHeatmap';
import QuoteBoard from '../components/research/QuoteBoard';
import toast from 'react-hot-toast';

export default function ResearchPage() {
  const navigate = useNavigate();
  const { authenticated, activeTab, setAuth, clearAuth } = useResearchStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dashboardApi.auth(code.trim());
      setAuth(code.trim());
    } catch {
      toast.error('Invalid or expired dashboard access code');
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 px-4">
        <div className="w-full max-w-md card">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Research Workspace</h1>
            <p className="mt-2 text-sm text-gray-600">
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
            <button onClick={() => navigate('/')} className="text-sm text-brand-600 hover:text-brand-800">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Research Workspace</h1>
            <p className="mt-1 text-gray-600">Qualitative analysis tools for WISE narratives</p>
          </div>
          <button
            onClick={() => { clearAuth(); navigate('/dashboard'); }}
            className="btn-secondary text-sm"
          >
            Exit Research
          </button>
        </div>

        {/* Tabs */}
        <ResearchTabs />

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === 'explorer' && <NarrativeExplorer />}
          {activeTab === 'heatmap' && <ThemeHeatmap />}
          {activeTab === 'quotes' && <QuoteBoard />}
        </div>
      </div>
    </div>
  );
}
