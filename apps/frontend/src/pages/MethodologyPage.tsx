import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTour } from '../hooks/useTour';
import { methodologyTourSteps } from '../config/tourSteps';

const DOMAIN_MAPPING = [
  {
    domain: 'Social Mission & Impact',
    emes: 'Explicit aim to benefit the community (Social)',
    ensie: 'Integration pathways & social outcomes',
  },
  {
    domain: 'Governance & Participation',
    emes: 'Participatory nature / Decision-making not based on capital ownership (Governance)',
    ensie: 'Governance structure & stakeholder involvement',
  },
  {
    domain: 'Financial Sustainability',
    emes: 'Economic risk / Continuous activity producing goods/services (Economic)',
    ensie: 'Economic data & financial viability',
  },
  {
    domain: 'Workforce Development',
    emes: 'Minimum amount of paid work (Economic)',
    ensie: 'Human resources & training programmes',
  },
  {
    domain: 'Stakeholder Engagement',
    emes: 'Multi-stakeholder governance (Governance)',
    ensie: 'Partnership networks & community relations',
  },
  {
    domain: 'Innovation & Adaptation',
    emes: 'Initiative launched by a group of citizens (Social)',
    ensie: 'Innovation practices & digital transition',
  },
  {
    domain: 'Operational Effectiveness',
    emes: 'Significant level of economic risk / Autonomy (Economic)',
    ensie: 'Operational efficiency & quality management',
  },
  {
    domain: 'Policy & Ecosystem',
    emes: 'Limited profit distribution (Governance)',
    ensie: 'Policy environment & ecosystem support',
  },
  {
    domain: 'Environmental Sustainability',
    emes: 'Explicit aim to benefit the community (Social)',
    ensie: 'Environmental impact & circular economy practices',
  },
];

const RESEARCH_FOUNDATIONS = [
  {
    title: 'EMES European Research Network',
    year: 'Founded 1996',
    description:
      'The premier international research network focused on social enterprise and social economy. Developed the nine ideal-type indicators for identifying social enterprises across three dimensions: Economic/Entrepreneurial, Social, and Governance. These indicators serve as the foundational analytical framework for WISEShift.',
    color: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    accent: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  {
    title: 'ENSIE Impact-WISEs Framework',
    year: 'Since 2015',
    description:
      'Annual data collection across 10+ EU member states, systematically measuring economic data, human resources, integration pathways, and social outcomes of Work Integration Social Enterprises. Provides the empirical benchmarking foundation for WISEShift scoring.',
    color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
    accent: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  {
    title: 'PERSE Project (2001-2004)',
    year: 'EU 5th Framework Programme',
    description:
      'Analysed 160 WISEs across 12 EU countries, identifying 44 distinct WISE types and establishing comparative assessment methodologies. Coordinated by Prof. Marthe Nyssens at UCLouvain. Its typology informs the domain structure used in WISEShift.',
    color: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
    accent: 'text-purple-700 dark:text-purple-300',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  {
    title: 'WISESHIFT Horizon Europe Project (2025-2029)',
    year: 'Project ID: 101178477',
    description:
      'A EUR 3 million Horizon Europe research project with 13 partners across 8 countries, developing comprehensive WISE sustainability assessment tools and frameworks. This self-assessment tool is a direct output of the project research.',
    color: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    accent: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  {
    title: 'D-WISE Network',
    year: 'Ongoing',
    description:
      '18 indicators across 7 thematic areas specifically designed for WISEs employing persons with disabilities. Contributes the inclusive employment lens to the assessment framework, ensuring accessibility and disability-specific dimensions are captured.',
    color: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800',
    accent: 'text-rose-700 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  },
  {
    title: 'B-WISE Erasmus+ Blueprint (2020-2024)',
    year: '30 partners, 13 countries',
    description:
      'Erasmus+ sector skills alliance mapping digital skills needs in the WISE sector. Its competency framework informs the Innovation & Adaptation domain, ensuring digital readiness is appropriately assessed.',
    color: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800',
    accent: 'text-indigo-700 dark:text-indigo-300',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
];

const MATURITY_LEVELS = [
  {
    level: 1,
    name: 'Emerging',
    description: 'Initial awareness; ad-hoc practices with limited formal structures in place.',
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  },
  {
    level: 2,
    name: 'Developing',
    description: 'Basic processes established; some formalisation but inconsistent application.',
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  },
  {
    level: 3,
    name: 'Established',
    description: 'Systematic approaches in place; consistent practices across the organisation.',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  },
  {
    level: 4,
    name: 'Advanced',
    description: 'Data-driven optimisation; proactive improvement and strong stakeholder integration.',
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  {
    level: 5,
    name: 'Leading',
    description: 'Sector-leading practices; innovation driver and recognised exemplar across the EU.',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  },
];

const POLICY_ALIGNMENTS = [
  {
    title: 'EU Social Economy Action Plan (2021)',
    description:
      'The European Commission\'s roadmap for the social economy, supporting social enterprises to start up, scale up, and innovate. WISEShift domains directly map to the Action Plan\'s priorities around framework conditions, capacity building, and impact measurement.',
  },
  {
    title: 'Council Recommendation on Social Economy Framework Conditions (2023)',
    description:
      'Council recommendation inviting Member States to develop or update national strategies for the social economy. The assessment framework supports WISEs in demonstrating alignment with recommended framework conditions.',
  },
  {
    title: 'European Pillar of Social Rights',
    description:
      'The 20 key principles structured around equal opportunities, fair working conditions, and social protection. WISEShift assessment domains encompass workforce development, governance, and social mission indicators that map to Pillar principles.',
  },
  {
    title: 'UN Sustainable Development Goals',
    description:
      'Aligned with SDG 1 (No Poverty), SDG 8 (Decent Work and Economic Growth), SDG 10 (Reduced Inequalities), and SDG 12 (Responsible Consumption and Production). Each assessment domain contributes evidence towards one or more SDG targets.',
  },
];

const EXTERNAL_LINKS = [
  { name: 'EMES European Research Network', url: 'https://emes.net/' },
  { name: 'ENSIE (European Network of Social Integration Enterprises)', url: 'https://www.ensie.org/' },
  { name: 'WISESHIFT Horizon Europe Project', url: 'https://www.wiseshiftproject.eu/' },
  { name: 'EU Social Economy Gateway', url: 'https://social-economy-gateway.ec.europa.eu/' },
  { name: 'European Social Enterprise Monitor (ESEM)', url: 'https://euclidnetwork.eu/' },
  { name: 'B-WISE Erasmus+ Blueprint', url: 'https://www.bwiseproject.eu/' },
];

export default function MethodologyPage() {
  const { hasSeenTour, startTour } = useTour('methodology', methodologyTourSteps);

  useEffect(() => {
    if (!hasSeenTour) {
      const timeout = setTimeout(startTour, 500);
      return () => clearTimeout(timeout);
    }
  }, [hasSeenTour, startTour]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
            Methodology &amp; Research Foundations
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600 dark:text-gray-400">
            Grounded in European social enterprise research and policy frameworks
          </p>
        </div>

        {/* Section 1: Assessment Framework */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assessment Framework</h2>
          <p className="mt-3 max-w-4xl text-gray-600 dark:text-gray-400">
            The WISEShift self-assessment spans 9 domains, each carefully mapped to established
            European research frameworks. The domain structure synthesises the EMES ideal-type
            indicators with the ENSIE Impact-WISEs empirical dimensions, creating a comprehensive
            yet practical assessment instrument for Work Integration Social Enterprises.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    WISEShift Domain
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    EMES Indicator (Dimension)
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    ENSIE Impact-WISEs Dimension
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {DOMAIN_MAPPING.map((row) => (
                  <tr key={row.domain} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{row.domain}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{row.emes}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{row.ensie}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Research Foundations */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Research Foundations</h2>
          <p className="mt-3 max-w-4xl text-gray-600 dark:text-gray-400">
            WISEShift draws on over two decades of European research on social enterprise
            and work integration. The following projects and networks provide the empirical
            and theoretical grounding for the assessment tool.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {RESEARCH_FOUNDATIONS.map((item) => (
              <div
                key={item.title}
                className={`rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md ${item.color}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-lg font-bold ${item.accent}`}>{item.title}</h3>
                </div>
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.badge}`}
                >
                  {item.year}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Maturity Model */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Maturity Model</h2>
          <p className="mt-3 max-w-4xl text-gray-600 dark:text-gray-400">
            The WISEShift assessment uses a 5-level maturity scale aligned with EU social
            economy progression frameworks. Each level represents a stage of organisational
            development, from initial awareness to sector leadership.
          </p>

          <div className="mt-8 space-y-3">
            {MATURITY_LEVELS.map((level) => (
              <div
                key={level.level}
                className={`flex items-start gap-4 rounded-lg border p-4 ${level.color}`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-900 font-bold shadow-sm">
                  {level.level}
                </div>
                <div>
                  <h3 className="font-semibold">{level.name}</h3>
                  <p className="mt-0.5 text-sm opacity-90">{level.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Scoring Approach */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scoring Approach</h2>
          <p className="mt-3 max-w-4xl text-gray-600 dark:text-gray-400">
            The assessment uses a transparent, research-grounded scoring methodology that
            distinguishes between quantitative measurement and qualitative narrative enrichment.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Quantitative Scoring</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Weighted average per domain using maturity-scale questions (weight: 1.5x) and
                Likert-scale questions (weight: 1.0x). This weighting ensures that maturity
                assessments, which capture organisational capacity, carry proportionally
                greater influence.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Qualitative Enrichment</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Open-ended questions are <strong>not numerically scored</strong>. Instead, they
                enrich the assessment report with narrative evidence, contextual detail, and
                organisational voice — ensuring the human dimension is preserved alongside
                quantitative metrics.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Benchmarks</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Sector benchmarks are seeded from empirical data gathered through the ENSIE
                Impact-WISEs annual surveys, the European Social Enterprise Monitor (ESEM),
                and the PERSE project research — providing a robust comparative baseline
                across EU member states.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: EU Policy Alignment */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">EU Policy Alignment</h2>
          <p className="mt-3 max-w-4xl text-gray-600 dark:text-gray-400">
            The assessment framework is designed to support WISEs in demonstrating alignment
            with key European policy instruments and international development goals.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {POLICY_ALIGNMENTS.map((policy) => (
              <div
                key={policy.title}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{policy.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{policy.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: Links & Resources */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Links &amp; Resources</h2>
          <p className="mt-3 max-w-4xl text-gray-600 dark:text-gray-400">
            Explore the research networks, policy frameworks, and projects that underpin
            the WISEShift assessment methodology.
          </p>

          <div className="mt-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {EXTERNAL_LINKS.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{link.name}</span>
                    <span className="flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300">
                      Visit
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Back to Home CTA */}
        <div className="mt-16 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            Back to Self-Assessment
          </Link>
        </div>
      </div>
    </div>
  );
}
