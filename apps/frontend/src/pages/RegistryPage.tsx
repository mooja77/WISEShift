import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import PageSkeleton from '../components/common/PageSkeleton';

interface RegistryEntry {
  slug: string;
  organisationName: string;
  bio: string | null;
  country: string | null;
  region: string | null;
  sectors: string[];
  size: string | null;
  foundingYear: number | null;
  website: string | null;
  overallScore: number | null;
  maturityLevel: string | null;
  strengths: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RegistryResponse {
  success: true;
  data: RegistryEntry[];
  pagination: Pagination;
}

function getScoreColor(score: number): string {
  if (score >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3) return 'text-blue-600 dark:text-blue-400';
  if (score >= 2) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 4) return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800';
  if (score >= 3) return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
  if (score >= 2) return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
  return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
}

export default function RegistryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter inputs (local state for the form)
  const [countryInput, setCountryInput] = useState(searchParams.get('country') || '');
  const [sectorInput, setSectorInput] = useState(searchParams.get('sector') || '');

  const currentPage = Number(searchParams.get('page')) || 1;

  const fetchRegistry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', '20');

      const country = searchParams.get('country');
      const sector = searchParams.get('sector');
      if (country) params.set('country', country);
      if (sector) params.set('sector', sector);

      const res = await api.get<RegistryResponse>(`/registry?${params.toString()}`);
      setEntries(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: any) {
      const message =
        err?.response?.data?.error || err?.message || 'Failed to load registry data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchParams]);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (countryInput.trim()) params.country = countryInput.trim();
    if (sectorInput.trim()) params.sector = sectorInput.trim();
    params.page = '1';
    setSearchParams(params);
  };

  const goToPage = (page: number) => {
    const params: Record<string, string> = {};
    const country = searchParams.get('country');
    const sector = searchParams.get('sector');
    if (country) params.country = country;
    if (sector) params.sector = sector;
    params.page = String(page);
    setSearchParams(params);
  };

  if (loading) return <PageSkeleton />;

  // Calculate display range
  const rangeStart = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const rangeEnd = pagination
    ? Math.min(pagination.page * pagination.limit, pagination.total)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
            WISE Registry
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600 dark:text-gray-400">
            A growing directory of Work Integration Social Enterprises across Europe.
            Opt-in, transparent, community-driven.
          </p>
        </div>

        {/* Filter Bar */}
        <form
          onSubmit={handleSearch}
          className="mt-10 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="country-filter"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Country
              </label>
              <input
                id="country-filter"
                type="text"
                value={countryInput}
                onChange={(e) => setCountryInput(e.target.value)}
                placeholder="e.g. Belgium, Italy..."
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="sector-filter"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Sector
              </label>
              <input
                id="sector-filter"
                type="text"
                value={sectorInput}
                onChange={(e) => setSectorInput(e.target.value)}
                placeholder="e.g. Recycling, Food services..."
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              Search
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
            <button
              onClick={fetchRegistry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
            >
              Try again
            </button>
          </div>
        )}

        {/* Stats Bar + Download */}
        {!error && pagination && (
          <div className="mt-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pagination.total > 0 ? (
                <>
                  Showing{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {rangeStart}&ndash;{rangeEnd}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {pagination.total}
                  </span>{' '}
                  registered WISEs
                </>
              ) : (
                'No WISEs found matching your filters.'
              )}
            </p>
            <a
              href="/api/registry/export?format=csv"
              download
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Download CSV
            </a>
          </div>
        )}

        {/* Card Grid */}
        {!error && entries.length > 0 && (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => (
              <div
                key={entry.slug}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-1 flex-col p-6">
                  {/* Organisation Name */}
                  <Link
                    to={`/registry/${entry.slug}`}
                    className="text-lg font-bold text-gray-900 transition-colors group-hover:text-brand-600 dark:text-gray-100 dark:group-hover:text-brand-400"
                  >
                    {entry.organisationName}
                  </Link>

                  {/* Location Badge */}
                  {(entry.country || entry.region) && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {[entry.region, entry.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Sectors */}
                  {entry.sectors.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {entry.sectors.map((sector) => (
                        <span
                          key={sector}
                          className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        >
                          {sector}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Maturity Score */}
                  {entry.overallScore !== null && (
                    <div
                      className={`mt-4 rounded-lg border p-3 ${getScoreBgColor(entry.overallScore)}`}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Maturity Score
                        </span>
                        <span
                          className={`text-xl font-bold ${getScoreColor(entry.overallScore)}`}
                        >
                          {entry.overallScore.toFixed(1)}
                        </span>
                      </div>
                      {entry.maturityLevel && (
                        <p
                          className={`mt-1 text-xs font-semibold ${getScoreColor(entry.overallScore)}`}
                        >
                          {entry.maturityLevel}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Strengths */}
                  {entry.strengths.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Top strengths
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {entry.strengths.map((strength) => (
                          <span
                            key={strength}
                            className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          >
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Founded Year */}
                  {entry.foundingYear && (
                    <p className="mt-auto pt-4 text-xs text-gray-400 dark:text-gray-500">
                      Founded {entry.foundingYear}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State (no error, but no entries) */}
        {!error && !loading && entries.length === 0 && (
          <div className="mt-12 rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              No WISEs found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your filters or check back later as more organisations join the registry.
            </p>
          </div>
        )}

        {/* Pagination */}
        {!error && pagination && pagination.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Previous
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {pagination.page}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {pagination.totalPages}
              </span>
            </span>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= pagination.totalPages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Next
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-16 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Registry participation is voluntary. Profiles are based on completed self-assessments.
          </p>
        </div>
      </div>
    </div>
  );
}
