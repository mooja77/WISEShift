import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PageSkeleton from '../components/common/PageSkeleton';

interface DomainScore {
  domainKey: string;
  domainName: string;
  score: number;
}

interface RegistryProfile {
  slug: string;
  organisationName: string;
  bio: string | null;
  logoUrl: string | null;
  website: string | null;
  socialLinks: Record<string, string> | null;
  foundingYear: number | null;
  targetPopulations: string[];
  sectors: string[];
  country: string | null;
  region: string | null;
  size: string | null;
  overallScore: number | null;
  maturityLevel: string | null;
  strengths: string[];
  domainScores: DomainScore[];
}

/** Map domain keys to Tailwind bar colours */
const DOMAIN_COLORS: Record<string, string> = {
  governance: 'bg-indigo-500',
  'social-mission': 'bg-pink-500',
  employment: 'bg-amber-500',
  culture: 'bg-violet-500',
  economic: 'bg-emerald-500',
  stakeholders: 'bg-sky-500',
  support: 'bg-rose-500',
  'impact-measurement': 'bg-teal-500',
  'environmental-sustainability': 'bg-green-500',
};

/** Lighter track colours for the bar background */
const DOMAIN_TRACK_COLORS: Record<string, string> = {
  governance: 'bg-indigo-100 dark:bg-indigo-900/30',
  'social-mission': 'bg-pink-100 dark:bg-pink-900/30',
  employment: 'bg-amber-100 dark:bg-amber-900/30',
  culture: 'bg-violet-100 dark:bg-violet-900/30',
  economic: 'bg-emerald-100 dark:bg-emerald-900/30',
  stakeholders: 'bg-sky-100 dark:bg-sky-900/30',
  support: 'bg-rose-100 dark:bg-rose-900/30',
  'impact-measurement': 'bg-teal-100 dark:bg-teal-900/30',
  'environmental-sustainability': 'bg-green-100 dark:bg-green-900/30',
};

const SOCIAL_ICONS: Record<string, (props: React.SVGProps<SVGSVGElement>) => JSX.Element> = {
  twitter: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  facebook: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  instagram: (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z" />
    </svg>
  ),
};

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400 dark:text-gray-500';
  if (score >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3) return 'text-blue-600 dark:text-blue-400';
  if (score >= 2) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getMaturityBadgeClasses(level: string | null): string {
  if (!level) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  const l = level.toLowerCase();
  if (l.includes('leading') || l.includes('advanced'))
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (l.includes('established') || l.includes('developing'))
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  if (l.includes('emerging') || l.includes('beginning'))
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

export default function RegistryProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<RegistryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) {
      navigate('/registry');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get(`/registry/${slug}`);
        setProfile(res.data.data);
      } catch {
        setError('Organisation profile not found or could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [slug, navigate]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Profile Not Found
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
          <Link
            to="/registry"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Registry
          </Link>
        </div>
      </div>
    );
  }

  const location = [profile.region, profile.country].filter(Boolean).join(', ');
  const maxScore = 5;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <Link
            to="/registry"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Registry
          </Link>

          <div className="mt-4 flex items-start gap-5">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt={`${profile.organisationName} logo`}
                className="h-16 w-16 shrink-0 rounded-xl border border-gray-200 object-contain dark:border-gray-700"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gradient-to-br from-brand-100 to-brand-200 text-2xl font-bold text-brand-700 dark:border-gray-700 dark:from-brand-900/40 dark:to-brand-800/40 dark:text-brand-300">
                {profile.organisationName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {profile.organisationName}
              </h1>
              {location && (
                <p className="mt-1 flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Profile Summary Card ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">About</h2>

          {profile.bio && (
            <p className="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">{profile.bio}</p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.foundingYear !== null && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Founded
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {profile.foundingYear}
                </dd>
              </div>
            )}

            {profile.size && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Organisation Size
                </dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {profile.size}
                </dd>
              </div>
            )}

            {profile.website && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Website
                </dt>
                <dd className="mt-1">
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-4.5h6m0 0v6m0-6L9.75 14.25" />
                    </svg>
                  </a>
                </dd>
              </div>
            )}
          </div>

          {/* Social links */}
          {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              {Object.entries(profile.socialLinks).map(([platform, url]) => {
                const IconComponent = SOCIAL_ICONS[platform.toLowerCase()];
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={platform}
                    className="text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {IconComponent ? (
                      <IconComponent className="h-5 w-5" />
                    ) : (
                      <span className="text-xs font-medium uppercase">{platform}</span>
                    )}
                  </a>
                );
              })}
            </div>
          )}

          {/* Sectors */}
          {profile.sectors.length > 0 && (
            <div className="mt-5">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Sectors
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {profile.sectors.map((sector) => (
                  <span
                    key={sector}
                    className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                  >
                    {sector}
                  </span>
                ))}
              </dd>
            </div>
          )}

          {/* Target populations */}
          {profile.targetPopulations.length > 0 && (
            <div className="mt-5">
              <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Target Populations
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {profile.targetPopulations.map((pop) => (
                  <span
                    key={pop}
                    className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  >
                    {pop}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </section>

        {/* ── Maturity Summary ── */}
        {(profile.overallScore !== null || profile.maturityLevel) && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              WISE Maturity
            </h2>

            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-8">
              {/* Overall score */}
              {profile.overallScore !== null && (
                <div className="flex flex-col items-center">
                  <div className={`text-5xl font-extrabold tabular-nums ${getScoreColor(profile.overallScore)}`}>
                    {profile.overallScore.toFixed(1)}
                  </div>
                  <span className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    out of {maxScore}
                  </span>
                </div>
              )}

              <div className="flex flex-1 flex-col items-center sm:items-start">
                {profile.maturityLevel && (
                  <span
                    className={`inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ${getMaturityBadgeClasses(profile.maturityLevel)}`}
                  >
                    {profile.maturityLevel}
                  </span>
                )}

                {/* Strengths */}
                {profile.strengths.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Key Strengths
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.strengths.map((strength) => (
                        <span
                          key={strength}
                          className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        >
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Domain Scores Bar Chart ── */}
        {profile.domainScores.length > 0 && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Domain Scores
            </h2>

            <div className="mt-5 space-y-4">
              {profile.domainScores.map((ds) => {
                const pct = Math.min((ds.score / maxScore) * 100, 100);
                const barColor = DOMAIN_COLORS[ds.domainKey] || 'bg-gray-500';
                const trackColor = DOMAIN_TRACK_COLORS[ds.domainKey] || 'bg-gray-100 dark:bg-gray-700';

                return (
                  <div key={ds.domainKey}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {ds.domainName}
                      </span>
                      <span className={`text-sm font-bold tabular-nums ${getScoreColor(ds.score)}`}>
                        {ds.score.toFixed(1)}
                      </span>
                    </div>
                    <div className={`h-3 w-full overflow-hidden rounded-full ${trackColor}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Back to Registry ── */}
        <div className="mt-8 text-center">
          <Link
            to="/registry"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Registry
          </Link>
        </div>
      </div>
    </div>
  );
}
