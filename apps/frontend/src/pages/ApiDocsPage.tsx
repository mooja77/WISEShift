import { useState } from 'react';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/overview',
    description: 'High-level dataset summary including total assessments, countries represented, sectors covered, and date range of collected data.',
    supportsCSV: false,
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  {
    method: 'GET',
    path: '/statistics',
    description: 'Descriptive statistics per domain: mean, median, standard deviation, min, max, and sample size (n).',
    supportsCSV: true,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  {
    method: 'GET',
    path: '/benchmarks',
    description: 'Sector benchmark data with domain averages, enabling cross-sector comparison of WISE performance.',
    supportsCSV: true,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  {
    method: 'GET',
    path: '/assessments',
    description: 'Anonymised case-level scores with k-anonymisation (k=5). Records are suppressed when fewer than 5 assessments exist for a given grouping.',
    supportsCSV: true,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
];

const BASE_URL = '/api/v1/public';

export default function ApiDocsPage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedBase, setCopiedBase] = useState(false);

  const copyToClipboard = (text: string, index?: number) => {
    navigator.clipboard.writeText(text).then(() => {
      if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } else {
        setCopiedBase(true);
        setTimeout(() => setCopiedBase(false), 2000);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
            WISEShift Open Data API
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600 dark:text-gray-400">
            The first publicly queryable, outcomes-linked WISE dataset in Europe.
            Free, open access, no authentication required.
          </p>
        </div>

        {/* Base URL */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Base URL</h2>
          <div className="mt-3 flex items-center gap-3">
            <code className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-5 py-3 font-mono text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {BASE_URL}/
            </code>
            <button
              onClick={() => copyToClipboard(`${BASE_URL}/`)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Copy base URL"
            >
              {copiedBase ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              )}
            </button>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Endpoints</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            All endpoints are read-only and require no authentication.
          </p>

          <div className="mt-6 space-y-4">
            {ENDPOINTS.map((endpoint, index) => (
              <div
                key={endpoint.path}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${endpoint.color}`}>
                    {endpoint.method}
                  </span>
                  <code className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {BASE_URL}{endpoint.path}
                  </code>
                  {endpoint.supportsCSV && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      CSV supported
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {endpoint.description}
                </p>

                {endpoint.supportsCSV && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Add <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700">?format=csv</code> to download as CSV
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={`${BASE_URL}${endpoint.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-900/50"
                  >
                    Try it
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  </a>
                  {endpoint.supportsCSV && (
                    <a
                      href={`${BASE_URL}${endpoint.path}?format=csv`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                    >
                      Download CSV
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() => copyToClipboard(`${BASE_URL}${endpoint.path}`, index)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                  >
                    {copiedIndex === index ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Response Format */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Response Format</h2>
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    JSON
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">Default</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  All endpoints return JSON by default. Responses include metadata and data in a
                  consistent structure.
                </p>
                <code className="mt-2 block rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  GET {BASE_URL}/statistics
                </code>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800 dark:bg-green-900/40 dark:text-green-300">
                    CSV
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">Optional</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Append <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-gray-700">?format=csv</code> to
                  any supporting endpoint to receive a downloadable CSV file, ready for use in
                  spreadsheets or statistical software.
                </p>
                <code className="mt-2 block rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  GET {BASE_URL}/statistics?format=csv
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* Rate Limiting */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Rate Limiting</h2>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">30 requests per 15 minutes per IP</h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                  Requests exceeding this limit will receive a <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/40">429 Too Many Requests</code> response.
                  The rate limit resets automatically after the 15-minute window.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Privacy */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Data Privacy</h2>
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5C17.944 5.656 18 6.322 18 7c0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.678.056-1.344.166-1.999zm5.541 3.708a1 1 0 10-1.414 1.414L9 12.828l4.707-4.707a1 1 0 00-1.414-1.414L9 10l-1.293-1.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-300">Anonymised &amp; Privacy-Safe</h3>
                <p className="mt-1 text-sm leading-relaxed text-green-700 dark:text-green-400">
                  All data is anonymised. Case-level data is suppressed when fewer than 5
                  assessments exist (k-anonymity). No organisation names, access codes, or
                  narrative text are exposed through this API.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Try It section */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Try It</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Click any link below to open the endpoint in a new tab and see the live response.
          </p>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {ENDPOINTS.map((endpoint) => (
                <li key={endpoint.path}>
                  <a
                    href={`${BASE_URL}${endpoint.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${endpoint.color}`}>
                        {endpoint.method}
                      </span>
                      <code className="font-mono text-sm text-gray-800 dark:text-gray-200">
                        {BASE_URL}{endpoint.path}
                      </code>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                      <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Footer note */}
        <div className="mt-16 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Part of the WISEShift Horizon Europe research project (ID: 101178477).
            Data is updated as new assessments are submitted.
          </p>
        </div>
      </div>
    </div>
  );
}
