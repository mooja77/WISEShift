/**
 * Case Study Export Template
 *
 * Aligned with the WISESHIFT Horizon Europe project's 24-case-study methodology
 * (3 sectors × 8 countries). Each section can be pre-populated from assessment data
 * or left for the researcher to complete manually.
 */

export interface CaseStudySection {
  key: string;
  title: string;
  description: string;
  /** Which data source pre-populates this section */
  prePopulateFrom?: 'metadata' | 'scores' | 'narratives' | 'action-plans' | 'sector';
  /** If true, section is left empty for the researcher to fill */
  supplementary?: boolean;
  /** Ordered sub-sections / prompts within this section */
  prompts: CaseStudyPrompt[];
}

export interface CaseStudyPrompt {
  key: string;
  label: string;
  hint: string;
  /** Which specific data field to pull from, if auto-populated */
  dataSource?: string;
}

export const CASE_STUDY_SECTIONS: CaseStudySection[] = [
  {
    key: 'context',
    title: '1. Organisational Context',
    description: 'Background information about the WISE, its legal form, mission, and operating environment.',
    prePopulateFrom: 'metadata',
    prompts: [
      { key: 'name', label: 'Organisation Name', hint: 'Legal name of the WISE', dataSource: 'organisation.name' },
      { key: 'country', label: 'Country', hint: 'Country of operation', dataSource: 'organisation.country' },
      { key: 'region', label: 'Region', hint: 'Subnational region', dataSource: 'organisation.region' },
      { key: 'sector', label: 'Sector', hint: 'Primary sector of activity', dataSource: 'organisation.sector' },
      { key: 'size', label: 'Organisation Size', hint: 'Number of employees/participants', dataSource: 'organisation.size' },
      { key: 'legalStructure', label: 'Legal Structure', hint: 'Legal form (cooperative, association, social enterprise, etc.)', dataSource: 'organisation.legalStructure' },
      { key: 'foundingYear', label: 'Year Founded', hint: 'Year the organisation was established', dataSource: 'profile.foundingYear' },
      { key: 'targetPopulations', label: 'Target Populations', hint: 'Primary beneficiary groups', dataSource: 'profile.targetPopulations' },
      { key: 'mission', label: 'Mission Statement', hint: 'Describe the core social mission and objectives of the organisation' },
      { key: 'localContext', label: 'Local Context', hint: 'Describe the social, economic, and policy environment in which the WISE operates' },
    ],
  },
  {
    key: 'governance',
    title: '2. Governance & Democratic Processes',
    description: 'How the organisation is governed, decision-making structures, and stakeholder participation.',
    prePopulateFrom: 'scores',
    prompts: [
      { key: 'score', label: 'Governance Domain Score', hint: 'Self-assessment score and maturity level', dataSource: 'domainScores.governance' },
      { key: 'narrative', label: 'Governance Narratives', hint: 'Qualitative responses on governance practices', dataSource: 'narratives.governance' },
      { key: 'boardComposition', label: 'Board Composition', hint: 'Describe the composition and diversity of the governing body' },
      { key: 'participationMechanisms', label: 'Participation Mechanisms', hint: 'How do workers/participants influence decisions?' },
    ],
  },
  {
    key: 'employment',
    title: '3. Employment & Work Integration',
    description: 'Employment practices, work integration pathways, and participant outcomes.',
    prePopulateFrom: 'scores',
    prompts: [
      { key: 'score', label: 'Employment Domain Score', hint: 'Self-assessment score and maturity level', dataSource: 'domainScores.employment' },
      { key: 'narrative', label: 'Employment Narratives', hint: 'Qualitative responses on employment practices', dataSource: 'narratives.employment' },
      { key: 'pathways', label: 'Integration Pathways', hint: 'Describe the work integration model (transitional, permanent, supported employment, etc.)' },
      { key: 'transitionRate', label: 'Transition Rate', hint: 'Percentage of participants transitioning to open labour market (if applicable)' },
    ],
  },
  {
    key: 'impact',
    title: '4. Social Impact & Outcomes',
    description: 'Evidence of social impact and outcome measurement practices.',
    prePopulateFrom: 'scores',
    prompts: [
      { key: 'score', label: 'Social Impact Domain Score', hint: 'Self-assessment score and maturity level', dataSource: 'domainScores.social-impact' },
      { key: 'narrative', label: 'Social Impact Narratives', hint: 'Qualitative responses on impact measurement', dataSource: 'narratives.social-impact' },
      { key: 'outcomes', label: 'Key Outcomes', hint: 'What measurable outcomes does the WISE track?' },
      { key: 'evidenceBase', label: 'Evidence Base', hint: 'How is impact data collected and reported?' },
    ],
  },
  {
    key: 'sustainability',
    title: '5. Environmental Sustainability & Green Transition',
    description: 'Environmental practices, circular economy engagement, and green transition activities.',
    prePopulateFrom: 'scores',
    prompts: [
      { key: 'score', label: 'Environmental Sustainability Score', hint: 'Self-assessment score and maturity level', dataSource: 'domainScores.environmental-sustainability' },
      { key: 'narrative', label: 'Sustainability Narratives', hint: 'Qualitative responses on environmental practices', dataSource: 'narratives.environmental-sustainability' },
      { key: 'greenActivities', label: 'Green Activities', hint: 'Describe any circular economy, recycling, or environmental activities' },
      { key: 'greenTransition', label: 'Green Transition Plans', hint: 'How is the organisation adapting to EU Green Deal requirements?' },
    ],
  },
  {
    key: 'economic',
    title: '6. Economic Viability & Market Engagement',
    description: 'Financial sustainability, revenue models, and market positioning.',
    prePopulateFrom: 'scores',
    prompts: [
      { key: 'score', label: 'Economic Viability Score', hint: 'Self-assessment score and maturity level', dataSource: 'domainScores.economic-viability' },
      { key: 'narrative', label: 'Economic Narratives', hint: 'Qualitative responses on financial sustainability', dataSource: 'narratives.economic-viability' },
      { key: 'revenueModel', label: 'Revenue Model', hint: 'Primary revenue sources and business model' },
      { key: 'publicProcurement', label: 'Public Procurement', hint: 'Does the WISE access social clauses in public procurement?' },
    ],
  },
  {
    key: 'stakeholders',
    title: '7. Stakeholder Engagement & Networks',
    description: 'Relationships with stakeholders, partnerships, and ecosystem positioning.',
    prePopulateFrom: 'scores',
    prompts: [
      { key: 'score', label: 'Stakeholder Engagement Score', hint: 'Self-assessment score and maturity level', dataSource: 'domainScores.stakeholder-engagement' },
      { key: 'narrative', label: 'Stakeholder Narratives', hint: 'Qualitative responses on stakeholder engagement', dataSource: 'narratives.stakeholder-engagement' },
      { key: 'partnerships', label: 'Key Partnerships', hint: 'Describe strategic partnerships and network memberships' },
      { key: 'policyInfluence', label: 'Policy Engagement', hint: 'How does the WISE engage with local/national/EU policy?' },
    ],
  },
  {
    key: 'sector-specific',
    title: '8. Sector-Specific Insights',
    description: 'Additional context relevant to the WISE\'s specific sector (repair/reuse/recycling, agrifood, or community care).',
    prePopulateFrom: 'sector',
    prompts: [
      { key: 'sectorModule', label: 'Sector Module Results', hint: 'Scores and responses from sector-specific questions', dataSource: 'sectorScores' },
      { key: 'sectorChallenges', label: 'Sector-Specific Challenges', hint: 'What challenges are unique to this sector?' },
      { key: 'sectorOpportunities', label: 'Sector Opportunities', hint: 'What growth or innovation opportunities exist in this sector?' },
    ],
  },
  {
    key: 'policy-alignment',
    title: '9. EU Policy Alignment',
    description: 'How the WISE\'s practices align with key EU policy frameworks.',
    prePopulateFrom: 'scores',
    prompts: [
      { key: 'epsrAlignment', label: 'European Pillar of Social Rights', hint: 'Alignment with EPSR principles', dataSource: 'policyAlignment.epsr' },
      { key: 'sdgAlignment', label: 'UN Sustainable Development Goals', hint: 'Contribution to relevant SDGs', dataSource: 'policyAlignment.sdgs' },
      { key: 'seapAlignment', label: 'EU Social Economy Action Plan', hint: 'Alignment with SEAP objectives', dataSource: 'policyAlignment.seap' },
    ],
  },
  {
    key: 'challenges',
    title: '10. Challenges & Barriers',
    description: 'Key challenges faced by the organisation and strategies for addressing them.',
    supplementary: true,
    prompts: [
      { key: 'internalChallenges', label: 'Internal Challenges', hint: 'Organisational challenges (capacity, skills, resources)' },
      { key: 'externalBarriers', label: 'External Barriers', hint: 'Policy, regulatory, or market barriers' },
      { key: 'copingStrategies', label: 'Coping Strategies', hint: 'How does the organisation address these challenges?' },
      { key: 'supportNeeds', label: 'Support Needs', hint: 'What support would most help the organisation?' },
    ],
  },
  {
    key: 'interview-notes',
    title: '11. Interview Notes',
    description: 'Space for researcher field notes from semi-structured interviews (aligned with WISESHIFT interview protocol).',
    supplementary: true,
    prompts: [
      { key: 'interviewees', label: 'Interviewees', hint: 'Roles/positions of people interviewed (anonymised)' },
      { key: 'keyThemes', label: 'Key Themes', hint: 'Main themes emerging from interviews' },
      { key: 'quotes', label: 'Notable Quotes', hint: 'Significant direct quotes (anonymised)' },
      { key: 'observations', label: 'Researcher Observations', hint: 'Contextual observations from site visits' },
    ],
  },
  {
    key: 'documents',
    title: '12. Supporting Documents',
    description: 'List of supporting documentation reviewed as part of the case study.',
    supplementary: true,
    prompts: [
      { key: 'annualReports', label: 'Annual Reports', hint: 'References to annual/impact reports reviewed' },
      { key: 'policyDocs', label: 'Policy Documents', hint: 'Relevant national/local policy documents' },
      { key: 'otherDocs', label: 'Other Documents', hint: 'Any other supporting documentation' },
    ],
  },
];

/** Domain keys in the order they appear in case study sections */
export const CASE_STUDY_DOMAIN_MAP: Record<string, string> = {
  governance: 'governance',
  employment: 'employment',
  'social-impact': 'social-impact',
  'environmental-sustainability': 'environmental-sustainability',
  'economic-viability': 'economic-viability',
  'stakeholder-engagement': 'stakeholder-engagement',
  'training-development': 'training-development',
  'innovation-adaptation': 'innovation-adaptation',
  'wellbeing-support': 'wellbeing-support',
};
