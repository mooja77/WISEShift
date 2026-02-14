// ─── Resource Library ───
// Links per domain + maturity level: EU toolkits, ENSIE resources, ESF+ calls, case studies.

export interface Resource {
  title: string;
  url: string;
  type: 'toolkit' | 'guide' | 'case-study' | 'funding' | 'network' | 'policy';
  description: string;
}

export interface DomainResources {
  domainKey: string;
  /** Maturity level these resources target, or 'all' for general resources */
  maturityLevel: 'Emerging' | 'Developing' | 'Established' | 'Advanced' | 'Leading' | 'all';
  resources: Resource[];
}

export const DOMAIN_RESOURCES: DomainResources[] = [
  // ─── Governance & Democracy ───
  {
    domainKey: 'governance',
    maturityLevel: 'all',
    resources: [
      {
        title: 'EU Council Recommendation on Social Economy Framework Conditions (2023)',
        url: 'https://data.consilium.europa.eu/doc/document/ST-14837-2023-INIT/en/pdf',
        type: 'policy',
        description: 'EU Council recommendation establishing governance standards for social economy organisations.',
      },
      {
        title: 'EMES Network — Social Enterprise Indicators',
        url: 'https://emes.net/focus-areas/',
        type: 'guide',
        description: 'EMES democratic governance indicators for social enterprises, including participatory decision-making.',
      },
    ],
  },
  {
    domainKey: 'governance',
    maturityLevel: 'Emerging',
    resources: [
      {
        title: 'Social Enterprise Board Governance Toolkit',
        url: 'https://www.socialenterprise.org.uk/guides-resources/',
        type: 'toolkit',
        description: 'Step-by-step guide for establishing effective governance structures in social enterprises.',
      },
    ],
  },
  {
    domainKey: 'governance',
    maturityLevel: 'Developing',
    resources: [
      {
        title: 'CECOP-CICOPA — Cooperative Governance Models',
        url: 'https://www.cecop.coop/',
        type: 'network',
        description: 'European cooperative confederation providing governance resources and multi-stakeholder governance models.',
      },
      {
        title: 'Italian Social Cooperative Law (381/1991) — Multi-Stakeholder Governance',
        url: 'https://emes.net/publications/',
        type: 'case-study',
        description: 'How Italy\'s social cooperative framework mandates democratic, multi-stakeholder governance.',
      },
    ],
  },
  {
    domainKey: 'governance',
    maturityLevel: 'Established',
    resources: [
      {
        title: 'EU Social Economy Action Plan (2021) — Governance Provisions',
        url: 'https://ec.europa.eu/social/main.jsp?catId=1537&langId=en',
        type: 'policy',
        description: 'EU action plan including 38 concrete actions on governance frameworks for social economy organisations.',
      },
    ],
  },
  {
    domainKey: 'governance',
    maturityLevel: 'Advanced',
    resources: [
      {
        title: 'Erasmus+ KA2 — Cooperation Partnerships for Social Economy',
        url: 'https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-2/cooperation-partnerships',
        type: 'funding',
        description: 'EU funding for cross-border projects developing innovative governance practices.',
      },
    ],
  },

  // ─── Social Mission & Impact ───
  {
    domainKey: 'social-mission',
    maturityLevel: 'all',
    resources: [
      {
        title: 'ENSIE — European Network of Social Integration Enterprises',
        url: 'https://www.ensie.org/',
        type: 'network',
        description: 'Key EU network for WISEs, providing impact measurement resources and peer learning opportunities.',
      },
      {
        title: 'European Pillar of Social Rights — Action Plan',
        url: 'https://ec.europa.eu/social/main.jsp?catId=1607&langId=en',
        type: 'policy',
        description: 'EU social rights framework underpinning WISE social mission, including active support to employment (Principle 4).',
      },
    ],
  },
  {
    domainKey: 'social-mission',
    maturityLevel: 'Emerging',
    resources: [
      {
        title: 'Defining Your WISE Social Mission — ENSIE Guide',
        url: 'https://www.ensie.org/resources/',
        type: 'guide',
        description: 'Practical guide for defining and documenting a clear social mission aligned with EU WISE definitions.',
      },
    ],
  },
  {
    domainKey: 'social-mission',
    maturityLevel: 'Developing',
    resources: [
      {
        title: 'Theory of Change Toolkit for Social Enterprises',
        url: 'https://www.theoryofchange.org/what-is-theory-of-change/',
        type: 'toolkit',
        description: 'Step-by-step guide for developing a Theory of Change to map how your activities create social impact.',
      },
    ],
  },
  {
    domainKey: 'social-mission',
    maturityLevel: 'Established',
    resources: [
      {
        title: 'ENSIE Impact-WISEs Framework',
        url: 'https://www.ensie.org/projects/impact-wises/',
        type: 'toolkit',
        description: 'Standardised data collection framework for comparing WISE outcomes across Europe.',
      },
      {
        title: 'SROI Network — Guide to Social Return on Investment',
        url: 'https://socialvalueint.org/social-value/standards-guidance/',
        type: 'guide',
        description: 'Internationally recognised framework for measuring and valuing social outcomes.',
      },
    ],
  },
  {
    domainKey: 'social-mission',
    maturityLevel: 'Advanced',
    resources: [
      {
        title: 'European Social Enterprise Monitor (ESEM)',
        url: 'https://ec.europa.eu/social/main.jsp?catId=952&intPageId=2914&langId=en',
        type: 'toolkit',
        description: 'EU-wide benchmarking data for social enterprises, enabling comparison with sector peers.',
      },
    ],
  },

  // ─── Employment Pathways ───
  {
    domainKey: 'employment',
    maturityLevel: 'all',
    resources: [
      {
        title: 'ESF+ Programme — Employment Integration',
        url: 'https://ec.europa.eu/european-social-fund-plus/en',
        type: 'funding',
        description: 'EU flagship fund for employment and social inclusion, supporting WISE employment integration programmes.',
      },
      {
        title: 'European Qualifications Framework (EQF)',
        url: 'https://europa.eu/europass/en/european-qualifications-framework-eqf',
        type: 'guide',
        description: 'Framework for comparing qualifications across EU countries — useful for aligning training provision.',
      },
    ],
  },
  {
    domainKey: 'employment',
    maturityLevel: 'Emerging',
    resources: [
      {
        title: 'Supported Employment Toolkit — European Union of Supported Employment',
        url: 'https://www.euse.org/resources/',
        type: 'toolkit',
        description: 'Practical resources for developing supported employment programmes aligned with EU best practice.',
      },
    ],
  },
  {
    domainKey: 'employment',
    maturityLevel: 'Developing',
    resources: [
      {
        title: 'France\'s SIAE Model — Social Insertion through Economic Activity',
        url: 'https://www.ensie.org/wise-in-europe/',
        type: 'case-study',
        description: 'How France\'s structured insertion enterprises provide transitional employment pathways.',
      },
      {
        title: 'Spain\'s Empresas de Inserción — Integration Enterprise Model',
        url: 'https://www.ensie.org/wise-in-europe/',
        type: 'case-study',
        description: 'Spain\'s personalised integration itineraries for labour market insertion.',
      },
    ],
  },
  {
    domainKey: 'employment',
    maturityLevel: 'Established',
    resources: [
      {
        title: 'Italy\'s Cooperativa Sociale Type B',
        url: 'https://www.ensie.org/wise-in-europe/',
        type: 'case-study',
        description: 'How Italian social cooperatives integrate disadvantaged workers directly into productive enterprises.',
      },
    ],
  },
  {
    domainKey: 'employment',
    maturityLevel: 'Advanced',
    resources: [
      {
        title: 'Horizon Europe — Social Innovation Programme',
        url: 'https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe_en',
        type: 'funding',
        description: 'EU research funding for innovative employment integration models and social enterprise research.',
      },
    ],
  },

  // ─── Organisational Culture ───
  {
    domainKey: 'culture',
    maturityLevel: 'all',
    resources: [
      {
        title: 'European Charter of Fundamental Rights',
        url: 'https://fra.europa.eu/en/eu-charter',
        type: 'policy',
        description: 'EU rights framework covering dignity (Art. 1), non-discrimination (Art. 21), and disability integration (Art. 26).',
      },
    ],
  },
  {
    domainKey: 'culture',
    maturityLevel: 'Emerging',
    resources: [
      {
        title: 'Introduction to Trauma-Informed Practice',
        url: 'https://www.socialworkengland.org.uk/',
        type: 'guide',
        description: 'Foundational guide to trauma-informed approaches for organisations working with disadvantaged populations.',
      },
    ],
  },
  {
    domainKey: 'culture',
    maturityLevel: 'Developing',
    resources: [
      {
        title: 'Creating Inclusive Workplaces — European Anti-Discrimination Law',
        url: 'https://fra.europa.eu/en/themes/non-discrimination',
        type: 'guide',
        description: 'EU Fundamental Rights Agency resources on implementing non-discrimination in practice.',
      },
    ],
  },
  {
    domainKey: 'culture',
    maturityLevel: 'Established',
    resources: [
      {
        title: 'European Accessibility Act — Requirements',
        url: 'https://ec.europa.eu/social/main.jsp?catId=1202',
        type: 'policy',
        description: 'EU accessibility standards applicable to WISE services and workplaces.',
      },
    ],
  },
  {
    domainKey: 'culture',
    maturityLevel: 'Advanced',
    resources: [
      {
        title: 'Rights-Based Approaches in Social Work — European Social Work Standards',
        url: 'https://www.eassw.org/',
        type: 'guide',
        description: 'European Association of Schools of Social Work resources on rights-based, participatory practice.',
      },
    ],
  },

  // ─── Economic Sustainability ───
  {
    domainKey: 'economic',
    maturityLevel: 'all',
    resources: [
      {
        title: 'EU Social Economy Gateway',
        url: 'https://social-economy-gateway.ec.europa.eu/',
        type: 'network',
        description: 'Central EU resource for social economy organisations, including funding guides and networking tools.',
      },
      {
        title: 'Social Procurement — EU Directive 2014/24/EU (Article 20)',
        url: 'https://ec.europa.eu/growth/single-market/public-procurement/social-procurement_en',
        type: 'policy',
        description: 'EU directive allowing reserved contracts for social enterprises and WISEs.',
      },
    ],
  },
  {
    domainKey: 'economic',
    maturityLevel: 'Emerging',
    resources: [
      {
        title: 'Financial Planning for Social Enterprises — Start-Up Guide',
        url: 'https://www.socialenterprise.org.uk/guides-resources/',
        type: 'guide',
        description: 'Practical financial planning tools for early-stage social enterprises.',
      },
    ],
  },
  {
    domainKey: 'economic',
    maturityLevel: 'Developing',
    resources: [
      {
        title: 'ENSIE Revenue Data — How European WISEs Fund Themselves',
        url: 'https://www.ensie.org/resources/',
        type: 'guide',
        description: 'ENSIE data on WISE revenue models across Europe: ~43% public, ~38% B2B, ~20% private clients.',
      },
    ],
  },
  {
    domainKey: 'economic',
    maturityLevel: 'Established',
    resources: [
      {
        title: 'EU State Aid Rules for Social Enterprises',
        url: 'https://ec.europa.eu/competition-policy/state-aid_en',
        type: 'policy',
        description: 'Understanding EU state aid compliance for WISEs receiving public subsidies.',
      },
    ],
  },
  {
    domainKey: 'economic',
    maturityLevel: 'Advanced',
    resources: [
      {
        title: 'InvestEU — Social Investment Window',
        url: 'https://investeu.europa.eu/index_en',
        type: 'funding',
        description: 'EU investment programme with a social window providing capital for social enterprise growth.',
      },
    ],
  },

  // ─── Stakeholder Engagement ───
  {
    domainKey: 'stakeholders',
    maturityLevel: 'all',
    resources: [
      {
        title: 'ENSIE — Peer Learning & Networking',
        url: 'https://www.ensie.org/activities/',
        type: 'network',
        description: 'European WISE network offering conferences, working groups, and peer learning opportunities.',
      },
      {
        title: 'RREUSE — Reuse & Recycling Social Enterprises',
        url: 'https://www.rreuse.org/',
        type: 'network',
        description: 'European network for social enterprises in the reuse, repair, and recycling sector.',
      },
    ],
  },
  {
    domainKey: 'stakeholders',
    maturityLevel: 'Emerging',
    resources: [
      {
        title: 'Building Employer Partnerships — Practical Guide',
        url: 'https://www.euse.org/resources/',
        type: 'guide',
        description: 'How to develop employer relationships for participant placements and sustained employment integration.',
      },
    ],
  },
  {
    domainKey: 'stakeholders',
    maturityLevel: 'Developing',
    resources: [
      {
        title: 'Euclid Network — Social Enterprise Peer Learning',
        url: 'https://euclidnetwork.eu/',
        type: 'network',
        description: 'European network connecting social enterprise leaders for knowledge exchange and development.',
      },
    ],
  },
  {
    domainKey: 'stakeholders',
    maturityLevel: 'Established',
    resources: [
      {
        title: 'Erasmus+ KA2 — Cooperation Partnerships',
        url: 'https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-2/cooperation-partnerships',
        type: 'funding',
        description: 'EU funding for cross-border cooperation projects between social enterprises and WISEs.',
      },
    ],
  },
  {
    domainKey: 'stakeholders',
    maturityLevel: 'Advanced',
    resources: [
      {
        title: 'EU Social Economy Action Plan — Stakeholder Engagement',
        url: 'https://ec.europa.eu/social/main.jsp?catId=1537&langId=en',
        type: 'policy',
        description: 'EU action plan provisions on social economy ecosystem building and cross-sector partnerships.',
      },
    ],
  },

  // ─── Support Infrastructure ───
  {
    domainKey: 'support',
    maturityLevel: 'all',
    resources: [
      {
        title: 'European Social Work Traditions — Integrated Support Models',
        url: 'https://www.eassw.org/',
        type: 'guide',
        description: 'European approaches to holistic support and socio-professional accompaniment for disadvantaged populations.',
      },
    ],
  },
  {
    domainKey: 'support',
    maturityLevel: 'Emerging',
    resources: [
      {
        title: 'Key Worker Model — Getting Started',
        url: 'https://www.socialenterprise.org.uk/guides-resources/',
        type: 'toolkit',
        description: 'Practical guide for implementing individual key worker support in social enterprises.',
      },
    ],
  },
  {
    domainKey: 'support',
    maturityLevel: 'Developing',
    resources: [
      {
        title: 'France\'s Accompagnement Socioprofessionnel',
        url: 'https://www.ensie.org/wise-in-europe/',
        type: 'case-study',
        description: 'How French WISEs provide integrated socio-professional accompaniment through dedicated support workers.',
      },
    ],
  },
  {
    domainKey: 'support',
    maturityLevel: 'Established',
    resources: [
      {
        title: 'European Accessibility Act — Workplace Standards',
        url: 'https://ec.europa.eu/social/main.jsp?catId=1202',
        type: 'policy',
        description: 'EU accessibility requirements relevant to WISE support infrastructure and workplace design.',
      },
    ],
  },
  {
    domainKey: 'support',
    maturityLevel: 'Advanced',
    resources: [
      {
        title: 'Complex Needs Support — Multi-Agency Working',
        url: 'https://www.euse.org/resources/',
        type: 'guide',
        description: 'European frameworks for coordinating multiple agencies to support people with complex and intersecting barriers.',
      },
    ],
  },

  // ─── Impact Measurement & Learning ───
  {
    domainKey: 'impact-measurement',
    maturityLevel: 'all',
    resources: [
      {
        title: 'EU Social Economy Action Plan — Impact Measurement',
        url: 'https://ec.europa.eu/social/main.jsp?catId=1537&langId=en',
        type: 'policy',
        description: 'EU push for standardised impact measurement across the social economy.',
      },
      {
        title: 'Social Value International — Principles of Impact Measurement',
        url: 'https://socialvalueint.org/',
        type: 'guide',
        description: 'Internationally recognised standards for measuring and reporting social impact.',
      },
    ],
  },
  {
    domainKey: 'impact-measurement',
    maturityLevel: 'Emerging',
    resources: [
      {
        title: 'Getting Started with Impact Measurement — A Practical Guide',
        url: 'https://socialvalueint.org/social-value/standards-guidance/',
        type: 'toolkit',
        description: 'Beginner-friendly guide to setting up basic outcome tracking and impact measurement.',
      },
    ],
  },
  {
    domainKey: 'impact-measurement',
    maturityLevel: 'Developing',
    resources: [
      {
        title: 'Theory of Change — Building Your Impact Logic',
        url: 'https://www.theoryofchange.org/what-is-theory-of-change/',
        type: 'toolkit',
        description: 'Comprehensive guide to developing and using a Theory of Change framework.',
      },
    ],
  },
  {
    domainKey: 'impact-measurement',
    maturityLevel: 'Established',
    resources: [
      {
        title: 'ENSIE Impact-WISEs Data Collection Framework',
        url: 'https://www.ensie.org/projects/impact-wises/',
        type: 'toolkit',
        description: 'Standardised indicators for comparing WISE outcomes across European countries.',
      },
    ],
  },
  {
    domainKey: 'impact-measurement',
    maturityLevel: 'Advanced',
    resources: [
      {
        title: 'SROI Guide — Measuring Social Return on Investment',
        url: 'https://socialvalueint.org/social-value/standards-guidance/',
        type: 'guide',
        description: 'Detailed methodology for conducting and publishing SROI analysis.',
      },
      {
        title: 'Horizon Europe — Social Innovation & Impact Research',
        url: 'https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe_en',
        type: 'funding',
        description: 'EU research funding for innovative impact measurement approaches and social enterprise research partnerships.',
      },
    ],
  },
];

// ─── Helper Functions ───

/** Get all resources for a domain, optionally filtered by maturity level */
export function getDomainResources(domainKey: string, maturityLevel?: string): Resource[] {
  return DOMAIN_RESOURCES
    .filter(dr => dr.domainKey === domainKey && (dr.maturityLevel === 'all' || dr.maturityLevel === maturityLevel))
    .flatMap(dr => dr.resources);
}

/** Get resources matching a specific action plan recommendation by domain + current level */
export function getResourcesForRecommendation(domainKey: string, currentLevel: string): Resource[] {
  return getDomainResources(domainKey, currentLevel);
}

/** Resource type display labels */
export const RESOURCE_TYPE_LABELS: Record<Resource['type'], string> = {
  toolkit: 'Toolkit',
  guide: 'Guide',
  'case-study': 'Case Study',
  funding: 'Funding',
  network: 'Network',
  policy: 'Policy',
};

/** Resource type badge colours */
export const RESOURCE_TYPE_COLORS: Record<Resource['type'], string> = {
  toolkit: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  guide: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'case-study': 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  funding: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  network: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  policy: 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};
