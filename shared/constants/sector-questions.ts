import type { Question } from '../types/assessment.types.js';

export interface SectorModule {
  key: string;
  name: string;
  description: string;
  /** Sectors from the organisation profile that trigger this module */
  matchingSectors: string[];
  questions: Question[];
}

export interface SectorRecommendation {
  sectorKey: string;
  scoreRange: [number, number]; // [min, max)
  recommendation: string;
  description: string;
}

export const SECTOR_MODULES: SectorModule[] = [
  // 1. Repair / Reuse / Recycling sector
  {
    key: 'repair-reuse-recycling',
    name: 'Repair, Reuse & Recycling',
    description: 'Additional questions for WISEs operating in the circular economy — repair, reuse, recycling, upcycling, and waste management.',
    matchingSectors: ['Circular Economy & Reuse', 'Second-Hand & Social Retail', 'Green & Environmental Services'],
    questions: [
      {
        id: 'sec-rrr-q1',
        i18nKey: 'sectorQuestions.repairReuseRecycling.questions.q1.text',
        domainKey: 'repair-reuse-recycling',
        text: 'What volume of materials does your organisation divert from landfill annually through repair, reuse, or recycling activities?',
        type: 'likert',
        description: '1 = Less than 1 tonne, 2 = 1-10 tonnes, 3 = 10-50 tonnes, 4 = 50-200 tonnes, 5 = More than 200 tonnes. The EU Waste Framework Directive establishes a waste hierarchy prioritising prevention, reuse, and recycling. RREUSE member organisations collectively diverted over 1 million tonnes in 2023.',
        required: true,
        weight: 1.0,
        tags: ['waste-diversion', 'circular-economy'],
      },
      {
        id: 'sec-rrr-q2',
        i18nKey: 'sectorQuestions.repairReuseRecycling.questions.q2.text',
        domainKey: 'repair-reuse-recycling',
        text: 'How does your organisation develop participant skills that are transferable to the growing circular economy job market?',
        type: 'narrative',
        description: 'The EU estimates the circular economy transition will create 700,000+ new jobs by 2030. Describe how repair, sorting, quality control, logistics, and customer service skills developed in your WISE prepare participants for employment in the wider circular economy sector.',
        required: true,
        weight: 0,
        placeholder: 'Describe the circular economy skills participants develop and how these transfer to open-market employment...',
        tags: ['green-skills', 'employability'],
      },
      {
        id: 'sec-rrr-q3',
        i18nKey: 'sectorQuestions.repairReuseRecycling.questions.q3.text',
        domainKey: 'repair-reuse-recycling',
        text: 'How does your organisation engage with Extended Producer Responsibility (EPR) schemes or local authority waste management contracts?',
        type: 'narrative',
        description: 'The EU Waste Framework Directive requires Member States to establish EPR schemes. Many WISEs in the reuse sector operate under local authority contracts or EPR agreements. Describe your relationship with these systems and how they support your financial sustainability and social mission.',
        required: true,
        weight: 0,
        placeholder: 'Describe your engagement with EPR schemes, local authority contracts, or waste management partnerships...',
        tags: ['epr', 'partnerships'],
      },
      {
        id: 'sec-rrr-q4',
        i18nKey: 'sectorQuestions.repairReuseRecycling.questions.q4.text',
        domainKey: 'repair-reuse-recycling',
        text: 'To what extent does your organisation measure and communicate its environmental impact (CO2 avoided, resources saved, waste diverted)?',
        type: 'likert',
        description: '1 = No environmental impact measurement, 5 = Comprehensive lifecycle analysis with published environmental impact reports. RREUSE provides methodologies for calculating the environmental impact of reuse activities. The EU Circular Economy Monitoring Framework tracks progress at Member State level.',
        required: true,
        weight: 1.0,
        tags: ['environmental-measurement', 'impact'],
      },
      {
        id: 'sec-rrr-q5',
        i18nKey: 'sectorQuestions.repairReuseRecycling.questions.q5.text',
        domainKey: 'repair-reuse-recycling',
        text: 'How does your organisation contribute to community awareness of repair, reuse, and sustainable consumption?',
        type: 'narrative',
        description: 'WISEs in the circular economy often serve as community hubs for sustainable living — through repair cafes, donation centres, educational workshops, and affordable second-hand retail. Describe your community-facing activities and how they contribute to the EU Right to Repair agenda.',
        required: false,
        weight: 0,
        placeholder: 'Describe community engagement activities that promote repair, reuse, and sustainable consumption...',
        tags: ['community', 'awareness'],
      },
    ],
  },

  // 2. Agrifood sector
  {
    key: 'agrifood',
    name: 'Agrifood & Market Gardens',
    description: 'Additional questions for WISEs operating in agriculture, market gardening, food production, and food-related services.',
    matchingSectors: ['Agriculture & Market Gardens', 'Food & Hospitality'],
    questions: [
      {
        id: 'sec-af-q1',
        i18nKey: 'sectorQuestions.agrifood.questions.q1.text',
        domainKey: 'agrifood',
        text: 'To what extent does your organisation apply sustainable agricultural or food production practices (organic methods, reduced pesticides, water conservation, biodiversity)?',
        type: 'likert',
        description: '1 = No sustainable practices, 5 = Fully certified organic/sustainable with comprehensive environmental management. The EU Farm to Fork Strategy sets targets for 25% organic farmland by 2030 and 50% reduction in pesticide use. The Common Agricultural Policy (CAP) increasingly supports sustainable practices.',
        required: true,
        weight: 1.0,
        tags: ['sustainable-agriculture', 'organic'],
      },
      {
        id: 'sec-af-q2',
        i18nKey: 'sectorQuestions.agrifood.questions.q2.text',
        domainKey: 'agrifood',
        text: 'How does your organisation address food security, food waste reduction, or access to healthy food in your community?',
        type: 'narrative',
        description: 'Many agrifood WISEs contribute to local food security through community-supported agriculture (CSA), food banks, community meals, and affordable produce. The EU Farm to Fork Strategy aims to halve food waste by 2030. Describe how your WISE addresses these issues while providing work integration.',
        required: true,
        weight: 0,
        placeholder: 'Describe how your food-related activities address food security, waste reduction, or community nutrition...',
        tags: ['food-security', 'food-waste'],
      },
      {
        id: 'sec-af-q3',
        i18nKey: 'sectorQuestions.agrifood.questions.q3.text',
        domainKey: 'agrifood',
        text: 'What food-sector specific qualifications or certifications do participants gain through your programme?',
        type: 'narrative',
        description: 'The agrifood sector requires specific skills and certifications (food hygiene, organic production, HACCP, sustainable agriculture). Describe the qualifications your programme provides and how these align with labour market demand in the agrifood sector.',
        required: true,
        weight: 0,
        placeholder: 'Describe sector-specific qualifications, certifications, or skills training provided...',
        tags: ['qualifications', 'food-skills'],
      },
      {
        id: 'sec-af-q4',
        i18nKey: 'sectorQuestions.agrifood.questions.q4.text',
        domainKey: 'agrifood',
        text: 'How does your organisation contribute to short food supply chains and local food systems?',
        type: 'narrative',
        description: 'The EU supports short food supply chains as part of the Farm to Fork Strategy. WISEs in agrifood often sell directly to consumers through markets, box schemes, on-site shops, or community-supported agriculture. Describe your distribution model and its social and environmental benefits.',
        required: true,
        weight: 0,
        placeholder: 'Describe your local food distribution model and its contribution to short supply chains...',
        tags: ['local-food', 'supply-chains'],
      },
      {
        id: 'sec-af-q5',
        i18nKey: 'sectorQuestions.agrifood.questions.q5.text',
        domainKey: 'agrifood',
        text: 'How does working with food or in agriculture specifically benefit the wellbeing and recovery of your participants?',
        type: 'narrative',
        description: 'Social and therapeutic horticulture, care farming, and food-based activities are increasingly recognised for their mental health and wellbeing benefits. Describe the therapeutic or wellbeing dimensions of your programme and any evidence you have of these benefits.',
        required: false,
        weight: 0,
        placeholder: 'Describe the wellbeing or therapeutic benefits of food/agriculture-based work integration...',
        tags: ['wellbeing', 'therapeutic'],
      },
    ],
  },

  // 3. Community/Home Care for the Elderly sector
  {
    key: 'community-care',
    name: 'Community & Home Care',
    description: 'Additional questions for WISEs providing care services, home support, and community-based care for elderly, disabled, or vulnerable populations.',
    matchingSectors: ['Social Care & Health', 'Community & Home Care'],
    questions: [
      {
        id: 'sec-cc-q1',
        i18nKey: 'sectorQuestions.communityCare.questions.q1.text',
        domainKey: 'community-care',
        text: 'How does your organisation ensure quality of care while maintaining its work integration mission?',
        type: 'maturity',
        description: 'Care WISEs face a unique dual challenge: providing high-quality care services AND meaningful work integration. The EU European Care Strategy (2022) emphasises quality, affordability, and accessibility. Describe how you balance care quality standards with your social insertion objectives.',
        required: true,
        weight: 1.5,
        tags: ['care-quality', 'dual-mission'],
      },
      {
        id: 'sec-cc-q2',
        i18nKey: 'sectorQuestions.communityCare.questions.q2.text',
        domainKey: 'community-care',
        text: 'What care-sector specific qualifications and regulatory compliance does your programme address?',
        type: 'narrative',
        description: 'Care work is regulated across EU Member States, requiring specific qualifications, DBS/criminal record checks, and ongoing professional development. Describe how your programme meets these regulatory requirements while providing accessible pathways for disadvantaged workers.',
        required: true,
        weight: 0,
        placeholder: 'Describe care-sector qualifications, regulatory compliance, and how you make these accessible to participants...',
        tags: ['care-qualifications', 'regulation'],
      },
      {
        id: 'sec-cc-q3',
        i18nKey: 'sectorQuestions.communityCare.questions.q3.text',
        domainKey: 'community-care',
        text: 'How does your organisation address the growing demand for care workers while promoting decent working conditions?',
        type: 'narrative',
        description: 'The EU estimates a shortage of 7 million health and care workers by 2030. The European Care Strategy calls for improved working conditions and pay in the care sector. Describe how your WISE contributes to addressing care worker shortages while ensuring participants have decent working conditions.',
        required: true,
        weight: 0,
        placeholder: 'Describe how your work integration programme addresses care sector workforce needs and working conditions...',
        tags: ['care-workforce', 'decent-work'],
      },
      {
        id: 'sec-cc-q4',
        i18nKey: 'sectorQuestions.communityCare.questions.q4.text',
        domainKey: 'community-care',
        text: 'To what extent are care recipients and their families involved in the design and evaluation of your services?',
        type: 'likert',
        description: '1 = No involvement of care recipients, 5 = Care recipients and families co-design services and participate in quality evaluation. Person-centred care — a core EU principle — requires the active involvement of those receiving care.',
        required: true,
        weight: 1.0,
        tags: ['person-centred', 'co-design'],
      },
      {
        id: 'sec-cc-q5',
        i18nKey: 'sectorQuestions.communityCare.questions.q5.text',
        domainKey: 'community-care',
        text: 'Share an example of how your care WISE has created a pathway from social exclusion to meaningful employment in the care sector.',
        type: 'narrative',
        description: 'Care WISEs often work with participants who have personal experience of care needs (former carers, people with disabilities, refugees with care backgrounds). Describe a case that illustrates how lived experience can become professional expertise in care work.',
        required: false,
        weight: 0,
        placeholder: 'Share an anonymised example of a participant journey from exclusion to care sector employment...',
        tags: ['case-study', 'lived-experience'],
      },
    ],
  },
];

export const SECTOR_RECOMMENDATIONS: SectorRecommendation[] = [
  // Repair/Reuse/Recycling
  { sectorKey: 'repair-reuse-recycling', scoreRange: [0, 2], recommendation: 'Establish basic circular economy measurement and join RREUSE network', description: 'Begin tracking waste diversion volumes, connect with RREUSE for sector-specific guidance, and explore EPR scheme participation for stable revenue.' },
  { sectorKey: 'repair-reuse-recycling', scoreRange: [2, 3.5], recommendation: 'Develop accredited circular economy skills training and environmental impact reporting', description: 'Create accredited repair/recycling qualifications, implement environmental impact measurement using RREUSE methodologies, and develop community engagement programmes.' },
  { sectorKey: 'repair-reuse-recycling', scoreRange: [3.5, 5.1], recommendation: 'Lead circular economy innovation and influence EU Right to Repair policy', description: 'Pioneer new reuse/repair models, publish environmental impact data, contribute to EU Right to Repair consultations, and mentor other circular economy WISEs.' },
  // Agrifood
  { sectorKey: 'agrifood', scoreRange: [0, 2], recommendation: 'Adopt basic sustainable practices and explore short food supply chains', description: 'Begin organic/sustainable transition, establish local sales channels, connect with Farm to Fork Strategy resources, and explore CAP funding for sustainable practices.' },
  { sectorKey: 'agrifood', scoreRange: [2, 3.5], recommendation: 'Pursue organic certification and develop food-sector qualifications programme', description: 'Work toward organic certification, develop accredited food hygiene and agriculture qualifications, establish community food initiatives, and measure food waste reduction.' },
  { sectorKey: 'agrifood', scoreRange: [3.5, 5.1], recommendation: 'Pioneer social farming models and contribute to EU Farm to Fork Strategy', description: 'Develop innovative social/therapeutic agriculture models, publish evidence on wellbeing outcomes, contribute to EU social farming policy, and scale short supply chain approaches.' },
  // Community Care
  { sectorKey: 'community-care', scoreRange: [0, 2], recommendation: 'Establish care quality framework and basic sector qualifications pathway', description: 'Implement minimum care quality standards, develop a qualifications pathway meeting regulatory requirements, and connect with European Care Strategy resources.' },
  { sectorKey: 'community-care', scoreRange: [2, 3.5], recommendation: 'Develop person-centred care model with integrated work integration pathway', description: 'Implement person-centred care approaches, create structured progression from support worker to qualified carer, address decent work conditions, and involve care recipients in service design.' },
  { sectorKey: 'community-care', scoreRange: [3.5, 5.1], recommendation: 'Lead innovation in inclusive care workforce development', description: 'Pioneer models that turn lived experience into professional expertise, contribute to EU Care Strategy implementation, publish evidence on dual social-care outcomes, and scale the care WISE model.' },
];

export function getSectorModule(organisationSector: string): SectorModule | undefined {
  return SECTOR_MODULES.find(m => m.matchingSectors.includes(organisationSector));
}

export function getSectorRecommendation(sectorKey: string, score: number): SectorRecommendation | undefined {
  return SECTOR_RECOMMENDATIONS.find(
    r => r.sectorKey === sectorKey && score >= r.scoreRange[0] && score < r.scoreRange[1]
  );
}
