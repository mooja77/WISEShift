import { useState, useEffect, useCallback } from 'react';
import { researcherApi } from '../services/api';
import { DOMAINS } from '@wiseshift/shared';
import toast from 'react-hot-toast';
import {
  AcademicCapIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

type Tab = 'register' | 'query' | 'profile';

interface ResearcherProfile {
  id: string;
  email: string;
  name: string;
  institution: string;
  accessLevel: string;
  verified: boolean;
  ethicsApproval: string | null;
  dataAccessCount: number;
}

interface QueryResult {
  caseId: string;
  country: string | null;
  sector: string | null;
  size: string | null;
  overallScore: number | null;
  domainScores: Record<string, number>;
  completedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ResearcherPortalPage() {
  const [token, setToken] = useState(() => localStorage.getItem('wiseshift-researcher-token') || '');
  const [tab, setTab] = useState<Tab>(token ? 'query' : 'register');
  const [profile, setProfile] = useState<ResearcherProfile | null>(null);

  // Registration
  const [regEmail, setRegEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [regInstitution, setRegInstitution] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [showVerify, setShowVerify] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Query builder
  const [filters, setFilters] = useState({
    country: '',
    sector: '',
    size: '',
    minScore: '',
    maxScore: '',
    dateFrom: '',
    dateTo: '',
    domainKey: '',
  });
  const [results, setResults] = useState<QueryResult[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());

  // Access log
  const [accessLog, setAccessLog] = useState<any[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await researcherApi.getProfile();
      setProfile(res.data.data);
    } catch {
      // Token might be invalid
      setToken('');
      localStorage.removeItem('wiseshift-researcher-token');
      setTab('register');
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  const handleRegister = async () => {
    if (!regEmail || !regName || !regInstitution) {
      toast.error('All fields are required');
      return;
    }
    setRegLoading(true);
    try {
      const res = await researcherApi.register({ email: regEmail, name: regName, institution: regInstitution });
      toast.success('Account created! Enter your verification code.');
      setVerifyEmail(regEmail);
      setShowVerify(true);
      // In dev mode, show the code
      if (res.data.data.verificationCode) {
        toast(`Dev mode — verification code: ${res.data.data.verificationCode}`, { duration: 10000 });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyEmail || !verifyCode) {
      toast.error('Email and verification code are required');
      return;
    }
    setRegLoading(true);
    try {
      const res = await researcherApi.verify({ email: verifyEmail, verificationCode: verifyCode });
      const newToken = res.data.data.token || res.data.data.id;
      localStorage.setItem('wiseshift-researcher-token', newToken);
      setToken(newToken);
      setTab('query');
      toast.success('Email verified! You can now query data.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!verifyEmail) {
      toast.error('Enter your email');
      return;
    }
    // For returning users, we use their researcher ID stored in localStorage
    toast.error('Please register first or enter your researcher token directly.');
  };

  const handleQuery = async (page = 1) => {
    setQueryLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filters.country) params.country = filters.country;
      if (filters.sector) params.sector = filters.sector;
      if (filters.size) params.size = filters.size;
      if (filters.minScore) params.minScore = parseFloat(filters.minScore);
      if (filters.maxScore) params.maxScore = parseFloat(filters.maxScore);
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.domainKey) params.domainKey = filters.domainKey;

      const res = await researcherApi.query(params);
      setResults(res.data.data);
      setPagination(res.data.pagination);
      setSelectedCases(new Set());
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Query failed');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleBatchDownload = async (format: 'csv' | 'json') => {
    const cases = Array.from(selectedCases);
    if (cases.length === 0) {
      toast.error('Select at least one case to download');
      return;
    }
    try {
      const res = await researcherApi.batchDownload(cases, format);
      const blob = new Blob([res.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wiseshift-research-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${cases.length} cases downloaded as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Download failed');
    }
  };

  const handleFetchLog = async () => {
    try {
      const res = await researcherApi.getAccessLog();
      setAccessLog(res.data.data);
    } catch {
      toast.error('Failed to load access log');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wiseshift-researcher-token');
    setToken('');
    setProfile(null);
    setTab('register');
    setResults([]);
    toast.success('Signed out');
  };

  const toggleCase = (caseId: string) => {
    setSelectedCases(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedCases.size === results.length) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(results.map(r => r.caseId)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <AcademicCapIcon className="h-8 w-8 text-brand-600 dark:text-brand-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Researcher Portal</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Access WISESHIFT assessment data for academic research
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {[
            { key: 'register' as Tab, label: token ? 'Sign In' : 'Register', icon: UserCircleIcon },
            { key: 'query' as Tab, label: 'Query Data', icon: MagnifyingGlassIcon },
            { key: 'profile' as Tab, label: 'Profile', icon: ShieldCheckIcon },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'profile') handleFetchLog(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Register / Sign In Tab */}
        {tab === 'register' && (
          <div className="card max-w-lg mx-auto">
            {token ? (
              <div className="text-center">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-green-500" />
                <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Signed In</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{profile?.email || 'Loading...'}</p>
                <button onClick={handleLogout} className="btn-secondary mt-4">Sign Out</button>
              </div>
            ) : showVerify ? (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Verify Your Email</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={verifyEmail}
                      onChange={e => setVerifyEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verification Code</label>
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value)}
                      placeholder="Enter 6-character code"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <button onClick={handleVerify} disabled={regLoading} className="btn-primary w-full">
                    {regLoading ? 'Verifying...' : 'Verify Email'}
                  </button>
                  <button onClick={() => setShowVerify(false)} className="btn-secondary w-full">
                    Back to Registration
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Register for Data Access</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Create an account with your academic credentials to access anonymised WISESHIFT assessment data.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Institution</label>
                    <input
                      type="text"
                      value={regInstitution}
                      onChange={e => setRegInstitution(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <button onClick={handleRegister} disabled={regLoading} className="btn-primary w-full">
                    {regLoading ? 'Registering...' : 'Create Account'}
                  </button>
                  <button onClick={() => setShowVerify(true)} className="btn-secondary w-full">
                    Already registered? Verify email
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Query Builder Tab */}
        {tab === 'query' && (
          <div>
            {!token ? (
              <div className="card text-center py-12">
                <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Sign In Required</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Register and verify your email to access the query builder.
                </p>
                <button onClick={() => setTab('register')} className="btn-primary mt-4">Register</button>
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="card mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Query Builder</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Country</label>
                      <input
                        type="text"
                        value={filters.country}
                        onChange={e => setFilters(f => ({ ...f, country: e.target.value }))}
                        placeholder="e.g., IE, DE, FR"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sector</label>
                      <input
                        type="text"
                        value={filters.sector}
                        onChange={e => setFilters(f => ({ ...f, sector: e.target.value }))}
                        placeholder="e.g., recycling"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Size</label>
                      <select
                        value={filters.size}
                        onChange={e => setFilters(f => ({ ...f, size: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="">All sizes</option>
                        <option value="micro">Micro (1-10)</option>
                        <option value="small">Small (11-50)</option>
                        <option value="medium">Medium (51-200)</option>
                        <option value="large">Large (201-500)</option>
                        <option value="very_large">Very Large (500+)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Domain</label>
                      <select
                        value={filters.domainKey}
                        onChange={e => setFilters(f => ({ ...f, domainKey: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      >
                        <option value="">All domains</option>
                        {DOMAINS.map(d => (
                          <option key={d.key} value={d.key}>{d.shortName || d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Min Score</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={filters.minScore}
                        onChange={e => setFilters(f => ({ ...f, minScore: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Max Score</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={filters.maxScore}
                        onChange={e => setFilters(f => ({ ...f, maxScore: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => handleQuery(1)} disabled={queryLoading} className="btn-primary">
                      {queryLoading ? 'Searching...' : 'Search'}
                    </button>
                    <button
                      onClick={() => setFilters({ country: '', sector: '', size: '', minScore: '', maxScore: '', dateFrom: '', dateTo: '', domainKey: '' })}
                      className="btn-secondary"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {/* Results */}
                {results.length > 0 && (
                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Results {pagination && <span className="text-sm font-normal text-gray-500">({pagination.total} total)</span>}
                      </h3>
                      <div className="flex gap-2">
                        {selectedCases.size > 0 && (
                          <>
                            <button onClick={() => handleBatchDownload('csv')} className="btn-secondary text-xs flex items-center gap-1">
                              <ArrowDownTrayIcon className="h-3 w-3" /> CSV ({selectedCases.size})
                            </button>
                            <button onClick={() => handleBatchDownload('json')} className="btn-secondary text-xs flex items-center gap-1">
                              <ArrowDownTrayIcon className="h-3 w-3" /> JSON ({selectedCases.size})
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="px-2 py-2">
                              <input type="checkbox" checked={selectedCases.size === results.length && results.length > 0} onChange={selectAll} className="rounded" />
                            </th>
                            <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Case ID</th>
                            <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Country</th>
                            <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Sector</th>
                            <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Size</th>
                            <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Score</th>
                            <th className="px-2 py-2 text-gray-500 dark:text-gray-400">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map(r => (
                            <tr key={r.caseId} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                              <td className="px-2 py-2">
                                <input type="checkbox" checked={selectedCases.has(r.caseId)} onChange={() => toggleCase(r.caseId)} className="rounded" />
                              </td>
                              <td className="px-2 py-2 font-mono text-xs text-gray-900 dark:text-gray-100">{r.caseId}</td>
                              <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{r.country || '—'}</td>
                              <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{r.sector || '—'}</td>
                              <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{r.size || '—'}</td>
                              <td className="px-2 py-2 font-medium text-gray-900 dark:text-gray-100">
                                {r.overallScore != null ? r.overallScore.toFixed(1) : '—'}
                              </td>
                              <td className="px-2 py-2 text-gray-500 dark:text-gray-400">{r.completedAt || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Page {pagination.page} of {pagination.totalPages}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuery(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="btn-secondary text-xs"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => handleQuery(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="btn-secondary text-xs"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {results.length === 0 && pagination && (
                  <div className="card text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No results found. Try adjusting your filters.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div>
            {!token ? (
              <div className="card text-center py-12">
                <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Not Signed In</h2>
                <button onClick={() => setTab('register')} className="btn-primary mt-4">Register / Sign In</button>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="card">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Your Profile</h2>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{profile.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{profile.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Institution</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{profile.institution}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Access Level</dt>
                      <dd className="text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          profile.accessLevel === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {profile.accessLevel}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Data Queries Made</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{profile.dataAccessCount}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Ethics Approval</dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{profile.ethicsApproval || 'Not provided'}</dd>
                    </div>
                  </dl>

                  {profile.accessLevel !== 'approved' && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Provide your ethics approval reference number to request elevated access and get more detailed data.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          placeholder="Ethics approval reference"
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              if (input.value) {
                                try {
                                  await researcherApi.requestAccess({ ethicsApproval: input.value });
                                  toast.success('Access level upgraded!');
                                  fetchProfile();
                                } catch (err: any) {
                                  toast.error(err.response?.data?.error || 'Request failed');
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Access Log */}
                <div className="card">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <ClockIcon className="h-5 w-5" /> Access Log
                  </h2>
                  {accessLog.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No queries recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {accessLog.map((log, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-gray-100 py-2 dark:border-gray-800 last:border-0">
                          <div>
                            <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{log.endpoint}</span>
                            {log.resultCount != null && (
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({log.resultCount} results)</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <button onClick={handleLogout} className="btn-secondary">Sign Out</button>
                </div>
              </div>
            ) : (
              <div className="card text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Loading profile...</p>
              </div>
            )}
          </div>
        )}

        {/* Data Access Tiers Info */}
        <div className="mt-8 card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Data Access Tiers</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Public</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No registration needed</p>
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                <li>Aggregate statistics</li>
                <li>Sector benchmarks</li>
                <li>K-anonymised data</li>
              </ul>
            </div>
            <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-900/10">
              <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-400">Registered</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Email verification</p>
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                <li>Query builder access</li>
                <li>Anonymised case-level data</li>
                <li>Batch downloads (CSV/JSON)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-900/10">
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">Approved</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Ethics approval required</p>
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                <li>All registered features</li>
                <li>Enhanced case detail</li>
                <li>Sector-specific scores</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
