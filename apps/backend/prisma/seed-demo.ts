import { PrismaClient } from '@prisma/client';
import { RECOMMENDATION_TEMPLATES } from '@wiseshift/shared';

const prisma = new PrismaClient();

// ─── Maturity level from score ───
function maturityLevel(score: number): string {
  if (score < 1.5) return 'Emerging';
  if (score < 2.5) return 'Developing';
  if (score < 3.5) return 'Established';
  if (score < 4.5) return 'Advanced';
  return 'Leading';
}

// ─── Domain score from maturity + likert values ───
function domainScore(maturity: number, likert: number): number {
  return Math.round(((maturity * 1.5 + likert * 1.0) / 2.5) * 100) / 100;
}

// ─── Domain metadata ───
const DOMAINS: Record<string, { name: string; qPrefix: string }> = {
  'governance':          { name: 'Governance & Democracy',        qPrefix: 'gov' },
  'social-mission':      { name: 'Social Mission & Impact',       qPrefix: 'sm' },
  'employment':          { name: 'Employment Pathways',           qPrefix: 'emp' },
  'culture':             { name: 'Organisational Culture',        qPrefix: 'cul' },
  'economic':            { name: 'Economic Sustainability',       qPrefix: 'eco' },
  'stakeholders':        { name: 'Stakeholder Engagement',        qPrefix: 'stk' },
  'support':             { name: 'Support Infrastructure',        qPrefix: 'sup' },
  'impact-measurement':  { name: 'Impact Measurement & Learning', qPrefix: 'im' },
};

// ─── Organisation definitions ───
interface OrgDef {
  name: string;
  country: string;
  region: string;
  sector: string;
  size: string;
  legalStructure: string;
  accessCode: string;
  completedAt: string; // ISO date
  scores: Record<string, { maturity: number; likert: number }>;
  narratives: Record<string, string>; // questionId → text
}

const DEMO_ORGS: OrgDef[] = [
  // ───────────────────────────────────────────
  // 1. HIGH-PERFORMING — Advanced/Leading
  // ───────────────────────────────────────────
  {
    name: 'Kooperativ Kreislauf e.G.',
    country: 'Germany',
    region: 'North Rhine-Westphalia',
    sector: 'Circular Economy & Reuse',
    size: 'large',
    legalStructure: 'Genossenschaft (Cooperative)',
    accessCode: 'WISE-DEMO01',
    completedAt: '2025-11-15T10:30:00Z',
    scores: {
      'governance':         { maturity: 4, likert: 4 },
      'social-mission':     { maturity: 5, likert: 4 },
      'employment':         { maturity: 4, likert: 3 },
      'culture':            { maturity: 4, likert: 4 },
      'economic':           { maturity: 3, likert: 3 },
      'stakeholders':       { maturity: 4, likert: 3 },
      'support':            { maturity: 3, likert: 4 },
      'impact-measurement': { maturity: 3, likert: 3 },
    },
    narratives: {
      'gov-q3': 'Our supervisory board includes two elected participant representatives, a municipal councillor, a trade union delegate, and three founding members. Board composition is reviewed annually at the general assembly, and we apply a gender balance target of at least 40% women on the board, in line with the German cooperative governance code.',
      'gov-q4': 'We publish a full annual report including financial statements and social impact metrics, available on our website. Board meeting minutes are shared with all members within two weeks, and we hold quarterly open forums where any member can raise questions. Our transparency practices were recognised by the German cooperative audit federation (DGRV) in 2024.',
      'gov-q5': 'When deciding whether to expand into electronics refurbishment last year, we held a participatory workshop where current participants voted alongside staff and board members. The decision was approved with 78% support after three rounds of discussion, demonstrating genuine democratic governance in action.',
      'sm-q3': 'Our mission is to provide meaningful work integration for long-term unemployed persons, refugees with subsidiary protection, and people recovering from addiction, through circular economy activities. We currently serve approximately 85 participants annually, with a focus on the Ruhr region where structural unemployment remains above the national average.',
      'sm-q4': 'Over the past three years, 62% of our participants have transitioned to open-market employment or accredited vocational training within 12 months. We track outcomes using the ESEM social impact indicators, including housing stability and self-reported wellbeing. An independent evaluation by the University of Dortmund confirmed significant improvements in participants\' social capital scores.',
      'sm-q5': 'Beyond direct employment outcomes, our repair cafés serve over 3,000 community members annually, reducing an estimated 45 tonnes of e-waste from landfill. We have partnered with three local schools to deliver environmental education workshops, reaching 800 pupils per year and strengthening community awareness of the circular economy.',
      'emp-q3': 'We operate a graduated employment model: participants begin with a 6-month orientation in sorting and basic repair, progress to specialised repair workshops (textiles, electronics, furniture), and can advance to team leader roles. Contracts are typically 24-month transitional employment agreements under the German Social Code (SGB II §16i), with optional extension for complex cases.',
      'emp-q4': 'In 2024, 53 out of 85 participants completed their pathways: 34 moved to external employment, 12 entered vocational training (IHK-certified), and 7 were retained as permanent staff. Average time to first external placement is 14 months. We track placement sustainability at 6 and 12 months post-exit, with 71% retention at the 12-month mark.',
      'emp-q5': 'One participant, a Syrian refugee with engineering qualifications, joined our electronics workshop with limited German. Through our integrated language-work programme, she progressed from basic disassembly to leading quality control within 18 months, and was subsequently hired by a local IT recycling firm where she now mentors new employees.',
      'cul-q3': 'We maintain a zero-tolerance policy on discrimination, implemented through a clear complaints procedure and an elected dignity-at-work officer. All staff complete annual anti-discrimination training aligned with the German General Equal Treatment Act (AGG). We provide prayer rooms, flexible scheduling for religious observances, and culturally sensitive catering.',
      'cul-q4': 'Staff wellbeing is supported through an employee assistance programme (EAP), regular supervision sessions for frontline workers, and a 4-day compressed work week piloted since 2024. Annual staff satisfaction surveys show 82% positive engagement, and turnover among permanent staff is below 8%, well under the sector average.',
      'cul-q5': 'Our participant advisory council meets monthly and has successfully advocated for changes including later start times, a dedicated quiet room, and the introduction of peer mentoring. Their feedback directly influenced our decision to offer childcare subsidies, which increased participation rates among single parents by 35%.',
      'eco-q3': 'Revenue is split approximately 55% commercial sales (retail shops and online marketplace), 30% public contracts (municipal waste management and sorting), and 15% grants (ESF+ and state integration funding). We have consciously diversified away from grant dependency over the past five years, reducing it from 40% to 15%.',
      'eco-q4': 'We maintain a 3-month operating reserve and conduct quarterly financial reviews with the board. Our 5-year financial plan identifies risks including potential reduction in ESF+ funding post-2027 and competition from commercial repair services. We are currently developing social clauses in public procurement as a mitigation strategy, working with the NRW state government.',
      'eco-q5': 'Five years ago we relied on grants for 65% of revenue. By investing in our online shop and securing a municipal e-waste processing contract, we have shifted to a majority-commercial model. This transition was supported by a DZ Bank social economy loan and technical assistance from the Social Entrepreneurship Network Germany (SEND).',
      'stk-q3': 'Our key partnerships include the Jobcenter Dortmund (referral and co-funding), the Wuppertal Institute (research collaboration on circular economy metrics), the local chamber of commerce (IHK) for vocational certification, and three employer networks providing work placements. We are founding members of the regional WISE network and coordinate with ENSIE at EU level.',
      'stk-q4': 'We participate actively in the ENSIE European network, contributing to their annual benchmarking survey and attending the European Social Enterprise Research Conference. We co-authored a policy brief on social clauses in public procurement with RREUSE (the European reuse network) and contributed to the German federal government\'s social economy strategy consultation in 2024.',
      'stk-q5': 'Our partnership with Bosch Household Appliances began as a small pilot for refurbishing returned products. Over three years it has grown into a structured programme where Bosch provides training materials and spare parts, we handle refurbishment, and their retail partners sell certified refurbished goods. This partnership now generates 15% of our commercial revenue.',
      'sup-q3': 'We offer German language courses (A1-B2), psychosocial counselling (2 qualified counsellors on staff), addiction support referrals, housing assistance, debt counselling through a partnership with Diakonie, and digital literacy workshops. All participants receive an individualised integration plan developed within the first two weeks.',
      'sup-q4': 'All facilities are wheelchair-accessible, and we provide sign language interpretation upon request. We offer multilingual orientation materials in 6 languages (German, Arabic, Turkish, Farsi, Ukrainian, English). For participants with learning disabilities, we use visual work instructions and buddy systems. Working hours are flexible to accommodate medical appointments and caring responsibilities.',
      'sup-q5': 'When we identified that several participants were experiencing housing insecurity, we partnered with a local housing association to create a "work-and-live" programme offering temporary accommodation linked to employment participation. This holistic approach reduced drop-out rates by 25% among participants facing housing instability.',
      'im-q3': 'We use a mixed-methods approach: quantitative tracking through our CRM system (participation hours, certifications, placement rates, 6/12-month follow-up) and qualitative data collection through semi-annual participant interviews and case studies. We report against ESEM indicators and the German Social Reporting Standard (SRS). Data is reviewed quarterly by the management team and annually by the board.',
      'im-q4': 'Our 2023 impact evaluation identified that participants in the electronics stream had 20% higher placement rates than those in textiles. This led us to expand electronics training capacity and invest in new diagnostic equipment. We also identified through participant interviews that peer mentoring was highly valued, leading us to formalise the peer mentor role with a small stipend.',
      'im-q5': 'After our impact data revealed that participants with caring responsibilities had higher dropout rates, we introduced flexible scheduling and childcare support. Within one year, completion rates for this group rose from 55% to 78%. This evidence-informed change was cited in the NRW state ministry\'s annual WISE report as a model practice.',
    },
  },

  // ───────────────────────────────────────────
  // 2. ESTABLISHED — Strong social mission
  // ───────────────────────────────────────────
  {
    name: 'Les Jardins Solidaires SCOP',
    country: 'France',
    region: 'Occitanie',
    sector: 'Agriculture & Market Gardens',
    size: 'medium',
    legalStructure: 'SCOP (Société Coopérative et Participative)',
    accessCode: 'WISE-DEMO02',
    completedAt: '2025-12-03T14:15:00Z',
    scores: {
      'governance':         { maturity: 3, likert: 3 },
      'social-mission':     { maturity: 4, likert: 3 },
      'employment':         { maturity: 3, likert: 2 },
      'culture':            { maturity: 3, likert: 3 },
      'economic':           { maturity: 2, likert: 2 },
      'stakeholders':       { maturity: 3, likert: 2 },
      'support':            { maturity: 3, likert: 3 },
      'impact-measurement': { maturity: 2, likert: 2 },
    },
    narratives: {
      'gov-q3': 'Our SCOP governance board has 7 members elected by the cooperative\'s worker-members. Two seats are reserved for participant representatives, as encouraged by the French social and solidarity economy law (Loi Hamon 2014). We aim for geographical diversity reflecting our multi-site operations across the Occitanie region.',
      'gov-q4': 'Meeting minutes are published on our internal portal, and financial results are presented at the annual general assembly. We are working towards publishing a full ESG report by 2026, building on the requirements of the French loi PACTE. Information is available in French and simplified French for participants with limited literacy.',
      'gov-q5': 'Last year the cooperative voted on whether to open a new market garden site in Perpignan. Participant representatives presented their analysis of local employment needs, which was decisive in the 65-35 vote to proceed. This demonstrated that our democratic processes genuinely include the voices of those we serve.',
      'sm-q3': 'Our mission is the professional and social integration of people excluded from the labour market through organic market gardening and short-circuit food distribution. We specifically target RSA (Revenu de Solidarité Active) recipients, young people not in employment, education or training (NEETs), and women returning to work after long career breaks. We serve approximately 45 participants per year across three sites.',
      'sm-q4': 'In 2024, 58% of participants who completed their 12-month pathway achieved a positive exit (CDI/CDD employment or accredited training). We measure social outcomes including self-confidence (using a validated French psychometric tool), social network expansion, and housing stability. Independent evaluation by Avise confirmed improvements across all social indicators.',
      'sm-q5': 'Our weekly organic vegetable baskets reach 200 local families, including 40 who receive subsidised boxes through our solidarity pricing model. The gardens also serve as therapeutic green spaces: our partnership with the local Centre Médico-Psychologique refers patients for horticultural therapy sessions, bridging environmental and social impact.',
      'emp-q3': 'Participants enter on 4-month renewable CDDI contracts (Contrat à Durée Déterminée d\'Insertion) for up to 24 months. The pathway begins with garden-based activities (soil preparation, planting, harvesting), progresses to market sales and logistics, and includes vocational modules in organic agriculture certification (CCP maraîchage bio). Skills are validated through the VAE (Validation des Acquis de l\'Expérience) process.',
      'emp-q4': 'Of the 32 participants who completed their pathways in 2024, 12 entered external employment (8 in agriculture, 4 in other sectors), 7 entered AFPA or Pôle Emploi training programmes, and 3 became permanent cooperative members. We acknowledge that transition rates to the open market could be stronger and are developing employer partnerships.',
      'emp-q5': 'Marie-Claire, a single mother of three who had been out of work for 6 years, joined our programme with severe self-confidence issues. Through the structured garden work and our partnership with Emmaüs for housing support, she gained her organic farming certificate and was hired by a local producer. She now trains other women in our peer mentoring programme.',
      'cul-q3': 'We operate a strict non-discrimination charter aligned with the French Code du Travail and the Défenseur des Droits guidelines. We actively recruit from diverse communities including the local Roma population and North African diaspora. Our working language is French, but team leaders speak Arabic and Romanian to support integration. We provide Ramadan-adapted schedules during the holy month.',
      'cul-q4': 'Our permanent staff of 12 benefit from an annual training budget of €1,500 per person, regular supervision with an external psychologist (monthly group sessions), and two annual team-building retreats. Staff satisfaction is surveyed annually: in 2024, 75% reported positive engagement, though we note challenges with workload during peak harvest season.',
      'cul-q5': 'When participants raised concerns about insufficient break facilities during summer heatwaves, the cooperative invested in covered rest areas with water fountains at all three sites. The participant committee also proposed and implemented a shared recipe board where people from different cultures contribute dishes made with the garden\'s produce, fostering intercultural exchange.',
      'eco-q3': 'Our revenue comprises approximately 35% commercial sales (vegetable baskets, market sales, restaurant supply), 45% public funding (IAE funding from DIRECCTE, départemental insertion contracts), and 20% grants (ESF+, CAF, Fondation de France). We recognise our high dependency on public funding as a vulnerability.',
      'eco-q4': 'We conduct annual financial planning with our accountant and the SCOP network (URSCOP). We have identified key risks: dependency on IAE aid conventionnement (renewed every 3 years), seasonal revenue fluctuations, and climate vulnerability. We are exploring agri-tourism and catering as diversification strategies, with a feasibility study commissioned for 2026.',
      'eco-q5': 'Three years ago we nearly lost our IAE conventionnement due to insufficient transition rates. This crisis prompted us to invest in employer partnerships and vocational certification, which improved our outcomes and secured a stronger renewal. The experience taught us the importance of diversifying both our revenue and our employment outcomes.',
      'stk-q3': 'Key partnerships include DIRECCTE Occitanie (funding and regulation), Pôle Emploi and Mission Locale (participant referrals), the SCOP cooperative network, Biocoop organic retail chain (commercial outlet), local AMAP consumer associations, and the Toulouse agricultural chamber. We are members of the INAE (Insertion par l\'Activité Économique) network.',
      'stk-q4': 'We participate in the Réseau Cocagne (national network of insertion gardens) and have attended two ENSIE European conferences. We contributed to the French government\'s consultation on the social and solidarity economy strategy (France Relance). However, our engagement with EU-level networks could be stronger, and we plan to join an Erasmus+ KA2 partnership in 2026.',
      'stk-q5': 'Our partnership with Biocoop supermarkets began with a trial delivery of 20 baskets per week. After demonstrating consistent organic quality and reliability, the partnership has expanded to 100 baskets weekly across three Biocoop stores, with our produce prominently labelled as "solidarity-grown." This commercial relationship has been crucial for our financial sustainability.',
      'sup-q3': 'We provide socio-professional accompaniment (1 dedicated CIP – Conseiller en Insertion Professionnelle per 15 participants), access to French language courses through local associations, social worker referrals for housing and health issues, and partnerships with the CAF (Caisse d\'Allocations Familiales) for family support. All participants receive an initial diagnostic assessment.',
      'sup-q4': 'We accommodate participants with physical limitations through adapted tasks and ergonomic tools. Transportation is a significant barrier in rural Occitanie: we operate a minibus service from Toulouse and Carcassonne. Materials are available in simplified French. However, we acknowledge gaps in digital skills support and specialist disability services, which we aim to address.',
      'sup-q5': 'After noticing that several participants were struggling with isolation, we introduced a weekly community lunch where participants, staff, and local volunteers eat together. This simple intervention, suggested by participants themselves, measurably improved attendance and self-reported social connectedness, demonstrating how peer support complements professional services.',
      'im-q3': 'We track key indicators including attendance, skill progression (using our internal skills matrix), certification completions, and post-programme employment status at 3 and 6 months. Data is entered monthly into a shared spreadsheet by CIPs. We provide statistical returns to DIRECCTE as required for IAE conventionnement renewal, using the ASP (Agence de Services et de Paiement) platform.',
      'im-q4': 'Our most recent data review identified that participants with prior agricultural experience progressed faster and had better outcomes. This insight led us to create a "fast-track" pathway for experienced workers focused on certification rather than basic skills. We also noted lower retention among participants with long commutes, informing our decision to expand the minibus service.',
      'im-q5': 'We are honest that our impact measurement could be more systematic. Currently, much knowledge remains with individual CIPs rather than being captured in our data systems. We have budgeted for a new digital tracking tool in 2026, which will allow us to link participant characteristics to outcomes more rigorously and contribute to the Réseau Cocagne national benchmarking exercise.',
    },
  },

  // ───────────────────────────────────────────
  // 3. DEVELOPING — Young construction WISE
  // ───────────────────────────────────────────
  {
    name: 'Stichting Werkplaats Nieuw Perspectief',
    country: 'Netherlands',
    region: 'South Holland',
    sector: 'Construction & Trades',
    size: 'small',
    legalStructure: 'Stichting (Foundation)',
    accessCode: 'WISE-DEMO03',
    completedAt: '2026-01-08T09:45:00Z',
    scores: {
      'governance':         { maturity: 2, likert: 2 },
      'social-mission':     { maturity: 2, likert: 3 },
      'employment':         { maturity: 3, likert: 2 },
      'culture':            { maturity: 2, likert: 2 },
      'economic':           { maturity: 2, likert: 1 },
      'stakeholders':       { maturity: 1, likert: 2 },
      'support':            { maturity: 2, likert: 2 },
      'impact-measurement': { maturity: 1, likert: 1 },
    },
    narratives: {
      'gov-q3': 'Our stichting board has 4 members: the two founders, a local businessman, and a social worker. We recognise this is not yet sufficiently diverse. We have not yet included participant representation on the board, though we plan to create an advisory role for a participant representative in 2026.',
      'gov-q4': 'We share financial information at our annual supporter meeting and post a summary on social media. Formal transparency mechanisms are limited — we do not yet publish minutes or detailed impact reports. We acknowledge this is an area for significant improvement as we grow.',
      'gov-q5': 'Decisions are currently made informally between the two founders with board ratification. We had a situation where a participant strongly disagreed with a safety policy change, which made us realise we need a formal feedback mechanism. We are developing a participant suggestion box and quarterly feedback sessions.',
      'sm-q3': 'We provide construction work experience and basic trade skills to young men (18-30) with criminal records who face severe barriers to employment in the Netherlands. We work with approximately 15 participants per year, referred by the reclassering (probation service) and local municipalities. Our focus is on basic renovation and maintenance work.',
      'sm-q4': 'We track whether participants are in employment or training 3 months after leaving our programme. In 2024, 7 out of 12 completers found work (mostly temporary construction jobs) and 2 entered MBO (vocational) training. We know these outcomes are modest but believe they are meaningful given our participants\' complex backgrounds.',
      'sm-q5': 'One of our renovation projects restored a community centre in a deprived neighbourhood, providing both work experience for participants and a tangible community benefit. Local residents attended the opening and several expressed how the project changed their perception of people with criminal backgrounds.',
      'emp-q3': 'Participants join for 6-12 months on a werkleerstage (work-learning placement). They work on real renovation projects under supervision of our two master craftsmen, learning basic carpentry, painting, tiling, and demolition. We aim to help them build a portfolio of completed work to show prospective employers. There is no formal certification yet.',
      'emp-q4': 'Of our 12 participants who completed in 2024, 7 found employment (mostly via uitzendbureaus — temp agencies), 2 entered MBO training, and 3 had no positive outcome. We lose approximately 30% of starters due to no-shows, substance relapse, or re-offending. We are working with probation to improve early engagement.',
      'emp-q5': 'Jamal joined us after serving 18 months for drug offences. He had no work experience and no qualifications. Through our programme he discovered a talent for tiling, completed three successful projects, and was hired by a local contractor who visited one of our sites. He has now been employed for over a year and mentors new participants informally.',
      'cul-q3': 'We try to create a respectful, non-judgemental environment. Our policy is simple: everyone is treated with dignity regardless of their past. In practice, this means no questions about offences unless relevant to safety, and clear rules against discrimination or intimidation. We are aware we need to formalise these principles into a written code of conduct.',
      'cul-q4': 'Our small team of 4 permanent staff work intensively with participants, which can be emotionally demanding. We recently started monthly peer support sessions and are exploring external supervision. Staff retention has been good (no turnover in 2 years), but we recognise the risk of burnout as we grow.',
      'cul-q5': 'A participant from an Eritrean background felt excluded during tea breaks because conversations were always in Dutch. Another participant suggested a "language buddy" system, and they now practise Dutch together during breaks. This peer-led solution improved inclusion without requiring formal intervention.',
      'eco-q3': 'Our revenue is approximately 20% from renovation project fees (charged at below-market rates), 60% from municipal subsidies (gemeente participatiewet funding), and 20% from philanthropic grants (Oranje Fonds, VSBfonds). We are heavily dependent on municipal funding, which is renewed annually.',
      'eco-q4': 'Financial planning is basic: we prepare an annual budget with our accountant. We have approximately 6 weeks of operating reserves, which is precarious. Key risks include municipal funding cuts (Rotterdam has signalled potential reductions) and difficulty scaling project revenue given our small capacity. We need to develop a more robust financial strategy.',
      'eco-q5': 'We started three years ago with a single grant from VSBfonds. Since then we have secured municipal participatiewet contracts and begun charging for renovation work. Revenue has grown from €80,000 to €220,000, but costs have grown proportionally. Achieving financial sustainability remains our biggest challenge.',
      'stk-q3': 'Our main partners are the municipality of Rotterdam (funding), the reclassering (referrals), and one construction company that occasionally offers placements. We know our partnership base is too narrow. We have approached the local bouwsector (construction sector) association but have not yet established formal relationships.',
      'stk-q4': 'We are not yet connected to European networks. We attended one Social Enterprise NL event and found it useful. We would like to learn from similar WISEs in Belgium (like VOSEC members) and are exploring whether Erasmus+ partnerships could support our professional development. Our limited staff capacity is a barrier to external engagement.',
      'stk-q5': 'Our one employer partnership — with Bouwgroep Zuid-Holland — started when their site manager visited one of our projects. He was impressed by the quality of work and offered a trial placement. This has led to 3 participants being hired over 2 years, but we have not yet been able to replicate this with other employers.',
      'sup-q3': 'We provide on-site work supervision, basic Dutch language practice, and referrals to municipal social services. One staff member acts as a mentor/coach for all participants, meeting them weekly. We can refer to the reclassering for specialised support (substance abuse, mental health). We do not have in-house counselling capacity.',
      'sup-q4': 'Our premises are not fully accessible — the workshop is on the ground floor but the office is upstairs with no lift. We provide safety equipment and PPE in all sizes. Language support is informal (staff speak Dutch and English; one participant translates Tigrinya). We acknowledge significant gaps in accessibility and specialist support provision.',
      'sup-q5': 'When one participant was at risk of losing his housing, our mentor spent two days helping him navigate the municipal housing system and accompanied him to meetings. This ad-hoc crisis intervention prevented a dropout, but highlighted our need for a more structured partnership with housing services.',
      'im-q3': 'We track basic outcomes: number of participants, completion rates, and employment status at exit. Data is kept in a simple Excel spreadsheet maintained by the director. We provide summary statistics to our funders as required, but do not have a systematic impact measurement framework.',
      'im-q4': 'We have not yet used data systematically to improve our programme. However, we noticed anecdotally that participants who attended regularly in the first month were much more likely to complete. This observation (not yet verified with data) is informing our thinking about early engagement strategies.',
      'im-q5': 'We recognise that impact measurement is our weakest area. As a small team focused on delivery, we have struggled to find time for data collection and analysis. We have applied for a capacity-building grant to develop a proper monitoring and evaluation system in 2026.',
    },
  },

  // ───────────────────────────────────────────
  // 4. ADVANCED — Italian social cooperative
  // ───────────────────────────────────────────
  {
    name: 'Cooperativa Sociale Il Ponte',
    country: 'Italy',
    region: 'Lombardy',
    sector: 'Social Care & Health',
    size: 'large',
    legalStructure: 'Cooperativa Sociale di tipo B',
    accessCode: 'WISE-DEMO04',
    completedAt: '2025-10-22T16:00:00Z',
    scores: {
      'governance':         { maturity: 4, likert: 3 },
      'social-mission':     { maturity: 4, likert: 4 },
      'employment':         { maturity: 3, likert: 3 },
      'culture':            { maturity: 4, likert: 4 },
      'economic':           { maturity: 2, likert: 2 },
      'stakeholders':       { maturity: 3, likert: 3 },
      'support':            { maturity: 4, likert: 3 },
      'impact-measurement': { maturity: 3, likert: 2 },
    },
    narratives: {
      'gov-q3': 'As a cooperativa sociale di tipo B under Law 381/1991, our governance structure mandates multi-stakeholder participation. The board of 9 includes 3 worker-members, 2 disadvantaged-worker members (soci lavoratori svantaggiati), 2 volunteer members, and 2 external stakeholders. Elections occur annually at the assemblea dei soci, with full proportional representation.',
      'gov-q4': 'We publish our annual bilancio sociale (social balance sheet) in accordance with Italian Legislative Decree 112/2017 and the Guidelines of the Ministry of Labour. This includes detailed financial, social, and environmental reporting. The bilancio is submitted to the Registro Unico Nazionale del Terzo Settore (RUNTS) and available on our website in Italian and English.',
      'gov-q5': 'When we were offered a large cleaning contract that would have required employing workers below our usual support standards, the soci svantaggiati representatives argued persuasively against it at the board meeting. The cooperative voted to decline the contract, prioritising mission alignment over revenue — a decision that reinforced trust in our democratic governance.',
      'sm-q3': 'Our mission is the socio-lavorativo integration of people with psychiatric disabilities, intellectual disabilities, and former substance users, through productive activities in laundry services, green maintenance, and facility management. As a tipo B cooperative, at least 30% of our workforce must be disadvantaged workers (we currently maintain 42%). We serve approximately 110 participants across the Province of Brescia.',
      'sm-q4': 'We measure social outcomes using the ICF (International Classification of Functioning) framework adapted for work integration, tracking improvements in autonomy, social participation, and occupational functioning. In 2024, 85% of participants showed measurable improvement on at least 2 out of 3 ICF domains. Our partnership with the local ASL (health authority) provides independent clinical outcome verification.',
      'sm-q5': 'Our green maintenance crews maintain public parks in 8 municipalities, creating visible community contribution. When residents initially resisted having people with psychiatric disabilities working in their parks, we organised open days where participants demonstrated their skills. Attitudes shifted dramatically, and we now receive requests from additional municipalities to expand our services.',
      'emp-q3': 'Participants enter on borse lavoro (work bursaries) of 3-6 months, progressing to tirocini formativi (training internships) and ultimately to cooperative membership as soci lavoratori svantaggiati with regular employment contracts. Our employment model is structured around three productive activities: industrial laundry (60 workers), green maintenance (35 workers), and facility management (15 workers). The ASL provides clinical support throughout.',
      'emp-q4': 'In 2024, of 110 participants: 78 maintained stable employment within the cooperative, 8 transitioned to external employment, 12 were in training/internship phases, and 12 experienced interruptions (hospitalisation, relapse). For our population, stable supported employment within the cooperative is itself a primary positive outcome, as many face lifelong disability.',
      'emp-q5': 'Marco, diagnosed with schizophrenia at 19, spent 8 years cycling between hospital and sheltered workshops. He joined our laundry service as a borsa lavoro participant, gained confidence through structured daily routines, and over 4 years progressed to become a cooperative member and team leader. He now supervises 6 colleagues and has not been hospitalised in 3 years.',
      'cul-q3': 'Our cooperative\'s DNA is built on the Italian social cooperative tradition of solidarietà. We maintain a written code of ethics reviewed annually, anti-discrimination procedures compliant with Italian employment law, and a designated ethics officer. Our workforce reflects significant diversity: approximately 60% of our disadvantaged workers are of non-Italian origin, primarily from sub-Saharan Africa and South America.',
      'cul-q4': 'Permanent staff (educatori, coordinators, administrative) receive an annual training budget of €2,000 per person through our consortium, CGM. We provide regular èquipe meetings (multidisciplinary team meetings) including ASL psychiatrists, and annual retreats. Staff satisfaction is high (78% positive in 2024) but we face challenges recruiting qualified educatori due to sector-wide shortages.',
      'cul-q5': 'Our annual festa della cooperativa brings together all members, their families, local politicians, and community members for a day of celebration and showcasing our work. Participants plan and run the catering and entertainment, taking visible ownership. This event consistently strengthens belonging and has become a major community engagement moment for the cooperative.',
      'eco-q3': 'Revenue is approximately 45% commercial contracts (laundry services to hospitals and hotels, green maintenance municipal contracts), 40% ASL health authority conventions (per-capita funding for therapeutic programmes), and 15% European/regional grants (ESF+, Fondazione Cariplo). Our commercial revenue has grown steadily but remains insufficient for full financial independence.',
      'eco-q4': 'We conduct rigorous financial planning through our consortium CGM, with quarterly reviews and 3-year projections. Key risks include dependence on ASL conventions (subject to regional health budget fluctuations), competition from commercial cleaning/laundry firms, and rising energy costs. Our consortium provides collective purchasing and risk-sharing mechanisms.',
      'eco-q5': 'The transition from predominantly grant-funded to majority commercial/convention revenue took over a decade. A critical moment was winning a hospital laundry contract through a social clause in public procurement (Art. 112 of the Italian Public Procurement Code), which allowed our social impact to be valued alongside price and quality. This contract alone represents 25% of our current revenue.',
      'stk-q3': 'Key partnerships: ASL Brescia (clinical support and referrals), Comune di Brescia (municipal contracts), Consorzio CGM (consortium services — training, finance, quality), Confcooperative (advocacy), University of Brescia (research), 3 hospitals and 5 hotels (commercial clients), ANFFAS (disability advocacy). We participate actively in the local piano di zona (territorial social plan).',
      'stk-q4': 'We are members of CECOP-CICOPA (European confederation of cooperatives) and have participated in EU-funded projects including an Erasmus+ partnership on social cooperative governance with French and Polish partners. We contributed to the Italian government\'s Terzo Settore reform consultations and regularly present at national cooperative conferences.',
      'stk-q5': 'Our partnership with the University of Brescia\'s occupational therapy programme has been transformative: they place 20 students annually in our services, providing additional support capacity while we provide real-world training. Three former students have joined our permanent staff. The university also conducts annual outcome evaluations that strengthen our evidence base.',
      'sup-q3': 'We provide a comprehensive support ecosystem: in-house educatori professionali (professional educators), psychologists, and social workers. ASL provides psychiatric consultations and medication management on-site. We offer Italian language courses, digital literacy training, financial literacy workshops, and recreational activities (sport, art therapy, music). Each participant has a PEI (progetto educativo individuale).',
      'sup-q4': 'All work sites are accessible, and we employ a specialist in reasonable accommodations. We provide supported transport for participants unable to travel independently. Materials are available in Italian, English, French, and Arabic. We have specialised programmes for people with intellectual disabilities (using TEACCH methodology) and for participants with dual diagnosis (psychiatric + substance use).',
      'sup-q5': 'When we expanded into green maintenance, we realised that outdoor work posed unique challenges for participants with psychiatric conditions (isolation, weather exposure, less structured environment). We developed a mobile support model where an educatore travels between outdoor sites daily, providing check-ins and crisis support. This innovation is now being adopted by other cooperatives in our consortium.',
      'im-q3': 'We use a structured outcome framework combining clinical measures (HoNOS — Health of the Nation Outcome Scales, GAF — Global Assessment of Functioning), social indicators (housing stability, social network, income), and employment measures (attendance, productivity, skill progression). Data is collected quarterly using a bespoke digital platform developed with our consortium CGM.',
      'im-q4': 'Our 2024 data analysis revealed that participants in the green maintenance programme showed greater improvement in social functioning (GAF scores) compared to the laundry service, likely due to community interaction and outdoor work benefits. This finding is informing our strategic plan to expand outdoor-based activities and has been published in the Impresa Sociale journal.',
      'im-q5': 'We participated in a multi-site study with 5 other CGM cooperatives comparing participant outcomes across different work integration models. The study found that cooperatives with higher staff-to-participant ratios achieved better outcomes, providing evidence that we successfully used to negotiate increased ASL per-capita funding for 2025.',
    },
  },

  // ───────────────────────────────────────────
  // 5. DEVELOPING — Spanish insertion enterprise
  // ───────────────────────────────────────────
  {
    name: 'Empresa de Inserción Futuro Verde S.L.',
    country: 'Spain',
    region: 'Andalusia',
    sector: 'Green & Environmental Services',
    size: 'medium',
    legalStructure: 'Empresa de Inserción',
    accessCode: 'WISE-DEMO05',
    completedAt: '2025-12-20T11:00:00Z',
    scores: {
      'governance':         { maturity: 2, likert: 3 },
      'social-mission':     { maturity: 3, likert: 3 },
      'employment':         { maturity: 2, likert: 3 },
      'culture':            { maturity: 3, likert: 2 },
      'economic':           { maturity: 2, likert: 2 },
      'stakeholders':       { maturity: 3, likert: 3 },
      'support':            { maturity: 2, likert: 2 },
      'impact-measurement': { maturity: 2, likert: 2 },
    },
    narratives: {
      'gov-q3': 'Our board consists of 5 members from the promoting entity (Fundación Amanecer, a social action foundation) plus 1 independent expert in environmental services. Worker representation exists through the comité de empresa but participants are not yet formally represented on the board. We recognise the need for greater participatory governance and plan to create a participant advisory committee.',
      'gov-q4': 'We publish our annual memoria de actividades (activity report) as required by Ley 44/2007 on empresas de inserción. Financial accounts are audited and filed with the Registro Mercantil. Internally, we hold quarterly staff meetings to share operational updates, but acknowledge that information flow to participants could be more structured and regular.',
      'gov-q5': 'When we had to decide between investing in new composting equipment or expanding our team, the management consulted with supervisors and participants in an open meeting. While the final decision was made by the board, participant input about preferring more colleagues to share the workload significantly influenced the outcome.',
      'sm-q3': 'As an empresa de inserción registered under Ley 44/2007, our core mission is the socio-laboral integration of people at risk of social exclusion through productive environmental services. We target long-term unemployed persons (>12 months), Roma community members, victims of gender violence, and immigrants in vulnerable situations. We serve approximately 30 participants through composting, park maintenance, and environmental education services in the province of Seville.',
      'sm-q4': 'In 2024, 65% of participants who completed their itinerario de inserción achieved a positive outcome: 8 entered employment (5 in green services, 3 in other sectors), 3 entered training, and 2 transitioned to supported employment. We use the standardised indicators required by the Junta de Andalucía for empresa de inserción registration, tracking employability improvement and social integration progress.',
      'sm-q5': 'Our environmental education programme reaches 15 schools in Seville province, with participants serving as co-educators alongside our environmental specialists. This dual impact — environmental awareness for children and confidence-building for participants — exemplifies how our social mission intersects with our productive activity. Three schools have created their own composting programmes as a result.',
      'emp-q3': 'Participants enter on contratos de inserción of 6-12 months (renewable up to 3 years as permitted by Ley 44/2007). The itinerario begins with basic environmental skills (waste sorting, composting management), progresses to specialised tasks (pruning, irrigation system maintenance), and includes employability modules (CV writing, interview skills, digital literacy). We are developing partnerships for certificados de profesionalidad in environmental services.',
      'emp-q4': 'Of 25 participants who left in 2024, 13 had positive exits (employment or training) — a 52% rate. Average time in programme is 14 months. We lose approximately 20% of participants due to personal crises (housing loss, family emergencies, immigration status changes). The Andalusian labour market remains challenging, with overall unemployment at 18%, and we are working to build more employer bridges.',
      'emp-q5': 'Fatima, a Moroccan woman who came to Spain through family reunification, joined our programme with no previous work experience and limited Spanish. Through our structured pathway in park maintenance and the Spanish language support we provided, she gained both skills and confidence. She was hired by a private gardening company and her employer specifically praised the professionalism she developed during our programme.',
      'cul-q3': 'We maintain a protocol against harassment and discrimination aligned with the Ley Orgánica 3/2007 for gender equality. Given our diverse participant group (approximately 40% immigrant, 15% Roma), cultural sensitivity training is provided to all staff annually. We accommodate religious practices and dietary requirements, and provide gender-separated changing facilities.',
      'cul-q4': 'Our 8 permanent staff participate in the annual training plan funded partly by FUNDAE (Fundación Estatal para la Formación en el Empleo). We recognise that working with participants from backgrounds of exclusion can be emotionally draining, and we have introduced monthly group reflection sessions facilitated by an external coach. However, we do not yet have a formal staff wellbeing policy.',
      'cul-q5': 'We celebrate intercultural events throughout the year — participants have organised Moroccan tea ceremonies, Roma music sessions, and an Andalusian flamenco evening. These cultural exchanges have visibly strengthened relationships between participants from different backgrounds and between participants and permanent staff, creating a more cohesive working environment.',
      'eco-q3': 'Revenue breaks down to approximately 30% commercial income (composting services for municipalities, park maintenance contracts), 50% public subsidies (Junta de Andalucía insertion enterprise subsidies, Ayuntamiento de Sevilla employment programme co-funding), and 20% EU and foundation grants (ESF+, Fundación "la Caixa"). Grant dependency remains high.',
      'eco-q4': 'We prepare annual budgets and quarterly financial reports for the board. Cash flow management is a constant challenge given the delayed payment patterns of public administrations in Spain (often 90-120 days). We maintain a €30,000 credit line for bridging. Key risk: the Junta de Andalucía insertion enterprise subsidies are under political review following regional elections.',
      'eco-q5': 'We have gradually increased commercial revenue from 15% to 30% over four years by winning municipal composting contracts through social clauses in public procurement (Ley 9/2017 on public sector contracts). However, competition from conventional environmental services companies remains fierce, and our higher labour costs (due to lower productivity during training phases) put us at a disadvantage in price-based tenders.',
      'stk-q3': 'Our key partners include Fundación Amanecer (promoting entity), Junta de Andalucía (Servicio Andaluz de Empleo for referrals), Ayuntamiento de Sevilla (municipal contracts and social services referrals), FAEDEI (Spanish federation of insertion enterprises), Red Cross Seville (co-referrals), and the University of Seville (student placements). We are members of REAS Red de Economía Social y Solidaria.',
      'stk-q4': 'Through FAEDEI, we contributed to the revision of the Spanish social economy law (Ley 5/2011) and the national insertion enterprise strategy. We have participated in one Erasmus+ project with French and Italian partners on green skills for social enterprises. We attended the European Social Enterprise Research Conference in 2024 and are exploring partnership opportunities with Portuguese empresas de inserção.',
      'stk-q5': 'Our partnership with the Red Cross started with simple mutual referrals. Over two years, it has evolved into a coordinated pathway where Red Cross provides initial social stabilisation (housing, legal status, emergency support) and then refers participants to us for employment integration. This sequential model has improved our participant retention rates because people arrive with basic needs already addressed.',
      'sup-q3': 'We provide technical training (environmental skills), employability workshops (CV, interviews, digital skills), Spanish language classes for immigrant participants, and a dedicated orientadora laboral (employment counsellor) at 1:15 ratio. Referrals to external services include social workers at municipal social services, healthcare through the Servicio Andaluz de Salud, and legal advice through partnership with a pro-bono law firm.',
      'sup-q4': 'Our work sites are outdoors, which creates both accessibility challenges (uneven terrain) and benefits (open-air environment). We provide all necessary PPE and sun protection. We accommodate participants with physical limitations through task allocation. For participants with limited Spanish, supervisors use visual instructions and a bilingual colleague translates Arabic-Spanish. We acknowledge that our support for people with mental health conditions is insufficient.',
      'sup-q5': 'One participant was at risk of deportation due to an immigration status issue. Our orientadora laboral connected her with the pro-bono law firm partner, who resolved her residence permit renewal. Without this intervention, she would have lost her insertion contract and her progress. This case convinced us to formalise our immigration law referral pathway.',
      'im-q3': 'We use the monitoring system required by the Junta de Andalucía for empresas de inserción: standardised indicators including employability improvement, social integration progress, and post-programme employment at 6 months. Data is collected by the orientadora laboral using the regional government\'s digital platform. We also conduct exit interviews with all completing participants.',
      'im-q4': 'Analysis of our 2023-2024 data showed that participants who completed at least one certificado de profesionalidad module had significantly higher employment rates (72% vs. 45%). This finding is driving our investment in formalising vocational qualifications within the insertion itinerario. We also identified that participants referred by Red Cross had higher completion rates, supporting the value of pre-stabilisation.',
      'im-q5': 'We participated in FAEDEI\'s national benchmarking study of 120 empresas de inserción. Our results were close to the national average on employment outcomes but below average on participant retention. This prompted us to focus on early engagement strategies and led to our decision to conduct a structured induction week for new participants, which we piloted in late 2024.',
    },
  },

  // ───────────────────────────────────────────
  // 6. DEVELOPING (LOW) — Danish café
  // ───────────────────────────────────────────
  {
    name: 'Socialøkonomisk Café Fællesskabet',
    country: 'Denmark',
    region: 'Capital Region',
    sector: 'Food & Hospitality',
    size: 'small',
    legalStructure: 'Socialøkonomisk Virksomhed (Registered Social Enterprise)',
    accessCode: 'WISE-DEMO06',
    completedAt: '2026-01-22T08:30:00Z',
    scores: {
      'governance':         { maturity: 2, likert: 1 },
      'social-mission':     { maturity: 2, likert: 2 },
      'employment':         { maturity: 2, likert: 2 },
      'culture':            { maturity: 3, likert: 2 },
      'economic':           { maturity: 1, likert: 2 },
      'stakeholders':       { maturity: 2, likert: 1 },
      'support':            { maturity: 2, likert: 2 },
      'impact-measurement': { maturity: 1, likert: 1 },
    },
    narratives: {
      'gov-q3': 'Café Fællesskabet was founded 18 months ago by two social educators. The governance board is currently the two founders plus one external accountant. We are registered as a socialøkonomisk virksomhed under the Danish Register of Social Enterprises but acknowledge our governance structure is minimal. We are exploring how to include participants and community members.',
      'gov-q4': 'We share basic financial information with our staff at monthly meetings and post updates on Instagram. We do not yet have formal reporting mechanisms. As a registered socialøkonomisk virksomhed, we commit to transparency requirements, but we have not yet published our first social accounts.',
      'gov-q5': 'Most decisions are made by the two founders through informal discussion. When we changed our opening hours, we did ask staff and participants for their preferences, and their input was taken into account. However, this was an ad-hoc consultation rather than a formal participatory process.',
      'sm-q3': 'Our mission is to provide a welcoming first step back to work for young people (18-29) experiencing mental health challenges, through meaningful work in our community café. We currently work with 8-10 participants at a time, referred by the kommune (municipal job centre) and local psychiatric services. Copenhagen has a high youth unemployment rate, and mental health is a growing barrier to employment.',
      'sm-q4': 'We have been operating for 18 months and have limited outcome data. Of our first 12 participants, 4 have moved to other work placements, 2 have returned to education, 3 are still with us, and 3 left without a positive outcome. We believe our impact is meaningful but acknowledge we cannot yet demonstrate it systematically.',
      'sm-q5': 'The café has become a meeting point for the local neighbourhood, attracting a diverse clientele. Several regular customers have become informal mentors to participants, offering career advice and social connection. This community-building aspect, though unplanned, may be as important as the direct employment training we provide.',
      'emp-q3': 'Participants join through løntilskud (wage subsidy) arrangements of 3-6 months with the kommune. They learn barista skills, food preparation, customer service, and basic hygiene certification (egenkontrol). We do not yet have a formalised progression pathway — participants move from kitchen support to counter service to barista work based on readiness assessed informally by supervisors.',
      'emp-q4': 'Given our 18-month history, our outcome data is limited. Of 12 participants who have left so far, 4 moved to other work placements (2 in hospitality, 2 in retail), 2 returned to education, and 6 had unclear outcomes (we lost contact). We need to improve our follow-up processes and transition support.',
      'emp-q5': 'Sofie, who had been hospitalised twice for anxiety and had not worked for three years, started with us doing quiet kitchen preparation work. Gradually, with encouragement, she moved to the counter during off-peak hours. After 5 months she was confidently serving customers and was hired by a bakery café that appreciated her calm, careful approach.',
      'cul-q3': 'We strive to create a "hyggeligt" (cosy, warm) environment where people feel safe and valued. Our approach is trauma-informed: we never pressure participants to disclose their conditions, we maintain flexible expectations, and we model respectful communication. We do not have a written anti-discrimination policy but discrimination of any kind would not be tolerated.',
      'cul-q4': 'Our team is small: 2 founders (who work full-time), 1 part-time baker, and 1 part-time social pedagogue. We support each other informally but do not have structured supervision or wellbeing support. The founders report feeling stretched thin, and we recognise the need for better staff support as we grow.',
      'cul-q5': 'One participant suggested creating a "mood board" in the staff area where people can indicate how they are feeling each day using coloured magnets (green/yellow/red), without having to explain. This simple tool allows colleagues and supervisors to be more sensitive to each other\'s needs and has been warmly adopted by both participants and permanent staff.',
      'eco-q3': 'Revenue is approximately 40% café sales (coffee, pastries, light lunches), 35% kommune løntilskud subsidies, 15% from a Velliv Foreningen (pension fund foundation) grant, and 10% from catering for local events. The café is not yet breaking even on commercial revenue alone, and we are dependent on subsidies and the start-up grant which expires in 2026.',
      'eco-q4': 'We have a basic annual budget but limited financial planning beyond the next 12 months. Our biggest financial risk is the Velliv grant ending in December 2026 without a replacement funding source. We are exploring increasing our catering business and applying to the Den Sociale Kapitalfond (social investment fund), but need support with business planning.',
      'eco-q5': 'We started with a 500,000 DKK start-up grant from Velliv Foreningen and personal savings from the founders. Café revenue has grown month-on-month but not fast enough to cover our social mission costs. We are learning that running both a viable café business and a quality social programme requires more resources than we initially anticipated.',
      'stk-q3': 'Our main partners are the local kommune job centre (referrals and løntilskud), the regional psychiatric service (clinical referrals), our landlord (who gives us a discounted lease), and a local bakery that supplies us at cost. We are members of the Danish social enterprise association (Socialøkonomisk Forum) but have not been very active.',
      'stk-q4': 'We have not yet engaged with EU networks. We know about ENSIE through the Danish social enterprise association and would like to connect with similar café-based WISEs in other countries (we are aware of several in Belgium and the Netherlands). Our limited capacity has prevented us from pursuing international engagement.',
      'stk-q5': 'Our most impactful partnership has been with a retired café owner from the neighbourhood who volunteers 2 mornings per week. He teaches professional barista skills and his calm, experienced mentorship has been valuable for participants. He also introduced us to his supplier network, helping us negotiate better purchasing terms.',
      'sup-q3': 'We provide on-the-job training and daily check-ins with participants. Our part-time social pedagogue meets each participant fortnightly for a longer support conversation. For clinical needs (medication, psychiatric appointments), we refer back to the regional psychiatric service. We do not have in-house counselling or comprehensive support services.',
      'sup-q4': 'The café is wheelchair-accessible (ground floor, accessible toilet). We accommodate participants\' therapy appointments and medical needs through flexible scheduling. Language has not been a significant barrier so far (all current participants speak Danish), but we recognise this may change as we serve more diverse populations. Sensory considerations for participants with anxiety (noise levels, lighting) are managed informally.',
      'sup-q5': 'One participant was struggling with anxiety attacks during busy lunch rushes. Rather than removing him from the café floor, we worked out a system where he could signal to a colleague and step into the quiet back room for a few minutes. This reasonable adjustment allowed him to gradually build his tolerance and he is now comfortable during peak times.',
      'im-q3': 'Our data collection is minimal: we keep basic records of participants (start date, referral source) and note outcomes when they leave. We do not systematically collect follow-up data, participant satisfaction, or intermediate indicators. We rely heavily on the kommune job centre\'s data for outcome tracking.',
      'im-q4': 'We have not conducted formal data analysis. Our improvements have been based on observation and participant feedback rather than systematic evidence. For example, we noticed that participants who started during quieter weekday mornings seemed to settle in better than those who started on busy Saturdays, and adjusted our induction accordingly.',
      'im-q5': 'We know our impact measurement needs significant development. We have asked the Socialøkonomisk Forum for advice and plan to implement the SRS (Social Return on Investment) Dansk model when we have capacity. For now, we collect participant stories and testimonials, which help with fundraising but are not a substitute for rigorous evaluation.',
    },
  },

  // ───────────────────────────────────────────
  // 7. ESTABLISHED — Belgian retail WISE
  // ───────────────────────────────────────────
  {
    name: 'ReStore Solidaire SC',
    country: 'Belgium',
    region: 'Wallonia',
    sector: 'Second-Hand & Social Retail',
    size: 'medium',
    legalStructure: 'Société Coopérative à Finalité Sociale',
    accessCode: 'WISE-DEMO07',
    completedAt: '2025-11-28T13:20:00Z',
    scores: {
      'governance':         { maturity: 3, likert: 3 },
      'social-mission':     { maturity: 3, likert: 4 },
      'employment':         { maturity: 3, likert: 3 },
      'culture':            { maturity: 3, likert: 3 },
      'economic':           { maturity: 3, likert: 3 },
      'stakeholders':       { maturity: 2, likert: 3 },
      'support':            { maturity: 3, likert: 2 },
      'impact-measurement': { maturity: 2, likert: 2 },
    },
    narratives: {
      'gov-q3': 'Our SC board has 7 members: 3 worker-cooperators, 1 participant representative, 1 representative from our promoting CPAS (Centre Public d\'Action Sociale), and 2 independent experts (a retail specialist and a social economy professor). Board composition reflects the Walloon social economy governance requirements. Elections are held at the annual general assembly.',
      'gov-q4': 'We submit our annual social accounts to the Conseil National de la Coopération, as required for recognised cooperative status. Financial statements are audited externally and presented at the AGM. We publish an annual rapport d\'activités distributed to all partners and available on our website. Internal communications include monthly team meetings and a digital newsletter.',
      'gov-q5': 'When we considered opening a second shop in Charleroi, the board organised consultations with staff, participants, and the Charleroi CPAS. Participant representatives raised concerns about transport accessibility, which led us to choose a location near the main bus station rather than the cheaper option in an industrial zone. This participatory location decision ensured better access for future participants.',
      'sm-q3': 'Our mission is to provide employment integration through second-hand retail, combining environmental sustainability (waste reduction through reuse) with social inclusion for people distant from the labour market. We target Article 60§7 workers (employed through CPAS), people with disabilities, long-term unemployed, and refugees. We serve approximately 35 participants annually through our two shops in Namur and Charleroi.',
      'sm-q4': 'In 2024, 60% of participants who completed their pathway achieved employment or entered training within 6 months. We measure social outcomes using the Walloon Region\'s standardised social economy indicators, including self-confidence improvement, social network expansion, and financial autonomy. Participant satisfaction surveys show 83% positive feedback, particularly around the value of customer interaction skills.',
      'sm-q5': 'Our shops diverted an estimated 120 tonnes of textiles and household goods from landfill in 2024, while simultaneously providing 35 people with meaningful work integration. The visible environmental contribution enhances participants\' sense of purpose — several have commented that knowing their work prevents waste and helps low-income families access affordable goods is deeply motivating.',
      'emp-q3': 'Participants typically enter on Article 60§7 contracts through CPAS (12-24 months). The pathway progresses through 4 stages: back-office sorting and pricing, shop floor merchandising, customer service, and till operation/cash handling. Throughout, participants attend weekly employability workshops (CV, interview skills, IT basics, French language for non-francophones). We provide internal certificates of competence validated by our retail partners.',
      'emp-q4': 'In 2024: 35 participants total, 22 completed their pathways. Of these, 8 entered employment in retail (Colruyt, Action, Zeeman), 3 in other sectors, 2 entered FOREM (Walloon employment service) training, and 9 returned to CPAS for further support. Our transition rate to employment (50%) is above the Walloon WISE average of 43%, but we aim to improve by strengthening employer partnerships.',
      'emp-q5': 'Aminata, a Guinean refugee with interrupted education, joined as an Article 60§7 worker unable to read or write French. Through our combined work-and-literacy approach (she learned French partially through product labelling and pricing), she progressed from sorting to customer service in 18 months. She was hired by a Colruyt store in Namur, where her multilingual skills (Susu, Pular, French) are highly valued in serving diverse customers.',
      'cul-q3': 'Our anti-discrimination policy is aligned with Belgian federal and Walloon regional equality legislation. As a diverse workplace (approximately 50% of participants are of non-Belgian origin), we provide intercultural awareness training to all staff. We maintain a confidential complaints procedure and have a designated person of trust (personne de confiance) as required by Belgian wellbeing at work legislation.',
      'cul-q4': 'Our permanent staff of 10 receive ongoing professional development through the social economy training fund (Fonds 4S). Regular supervision is provided by an external coach. We conduct annual wellbeing surveys: 2024 results showed high job satisfaction (80%) but concerns about workload (60% felt stretched). We are addressing this through better task distribution and considering hiring an additional coordinator.',
      'cul-q5': 'When Muslim participants requested a prayer space, we converted a small storeroom and equipped it with a prayer mat and compass. This small accommodation was noticed and appreciated far beyond the immediate users — it signalled to all participants that their identities and practices are respected. Several participants mentioned this as something that makes our workplace feel different from previous experiences.',
      'eco-q3': 'Revenue composition: approximately 55% shop sales (Namur and Charleroi stores), 30% CPAS Article 60 subsidies (for participant employment costs), 10% regional grants (Walloon social economy support), and 5% donations. We have a relatively healthy commercial revenue share for a Walloon WISE, reflecting the growing second-hand market demand.',
      'eco-q4': 'We prepare annual financial plans with our accountant and present quarterly to the board. We maintain a 2-month operating reserve. Key risks: saturation of the second-hand retail market (competition from Vinted, commercial second-hand chains), potential reduction in CPAS referrals, and rising rent costs. Our Charleroi expansion increases both revenue potential and fixed costs.',
      'eco-q5': 'Opening the Charleroi shop in 2023 required a €150,000 investment (fit-out, stock, initial operating costs). We secured financing through Crédal (Walloon ethical cooperative bank), a Walloon Region social economy grant, and retained earnings. After 18 months, the Charleroi shop is approaching break-even, contributing to our overall financial strengthening.',
      'stk-q3': 'Key partners: CPAS Namur and Charleroi (participant referrals and co-funding), FOREM (employability training), Ressources ASBL (Belgian reuse federation), Colruyt Group (employer partnership and donated goods), Oxfam Solidarité (sector network), FEBEA (federation of social enterprises). We also partner with 3 local associations for referrals: Lire et Écrire, Caritas, and CIRÉ.',
      'stk-q4': 'Through Ressources ASBL, we participate in the RREUSE European network for reuse social enterprises. We attended the RREUSE annual conference in 2024 and contributed data to their European impact study. We have not yet engaged in EU-funded projects but are interested in Erasmus+ partnerships focused on circular economy and social inclusion.',
      'stk-q5': 'Our partnership with Colruyt began with them donating unsold non-food items (clothing, household goods) to our shops. It has evolved into a structured programme where Colruyt provides retail management training to our participants and offers priority interview access for Article 60§7 workers completing their pathways. Four participants have been hired by Colruyt stores through this partnership in the past two years.',
      'sup-q3': 'Participant support includes a dedicated accompagnateur social (social counsellor) at 1:12 ratio, French language support through partnership with Lire et Écrire, digital skills workshops (weekly), and referrals to municipal social services for housing, health, and legal issues. We provide a comprehensive induction week for new participants covering workplace expectations, rights, and available support.',
      'sup-q4': 'Both shops are accessible (ground floor, wheelchair-accessible). We provide work clothing and PPE. For participants with limited French, we use multilingual signage (French, Arabic, English) and picture-based work instructions. Schedules are flexible to accommodate childcare, medical appointments, and FOREM training. We acknowledge gaps in mental health support — our social counsellor is not clinically trained.',
      'sup-q5': 'When several participants mentioned that the financial costs of lunch were a burden (many are on minimum CPAS income), we established a "solidarity fridge" stocked through our partnership with the local food bank. This practical measure removed a real barrier to participation and reduced the number of participants skipping lunch, which had been affecting afternoon productivity and wellbeing.',
      'im-q3': 'We use the monitoring framework required by the Walloon Region for subsidised social enterprises, tracking participant numbers, contract durations, exit destinations, and social indicator progression. Data is entered into the regional SIBIS platform. Additionally, we conduct annual participant satisfaction surveys and exit interviews. Reports are prepared biannually for the board.',
      'im-q4': 'Our 2024 data review highlighted that participants who worked in customer-facing roles showed greater improvements in self-confidence and communication skills than those primarily in back-office sorting. This finding is leading us to introduce customer interaction earlier in the pathway, with appropriate support for participants who find it challenging initially.',
      'im-q5': 'Comparing our 2023 and 2024 data, we noticed a decline in exit-to-employment rates for the Charleroi shop compared to Namur. Investigation revealed that the Charleroi job market is significantly tighter, and our employer partnership network was weaker there. We are now investing specifically in building Charleroi employer relationships, guided by data rather than assumptions.',
    },
  },

  // ───────────────────────────────────────────
  // 8. DEVELOPING — Irish digital CIC
  // ───────────────────────────────────────────
  {
    name: 'Digital Bridge CIC',
    country: 'Ireland',
    region: 'Dublin',
    sector: 'Digital & ICT Services',
    size: 'small',
    legalStructure: 'CIC (Community Interest Company)',
    accessCode: 'WISE-DEMO08',
    completedAt: '2026-02-01T10:00:00Z',
    scores: {
      'governance':         { maturity: 2, likert: 2 },
      'social-mission':     { maturity: 2, likert: 3 },
      'employment':         { maturity: 2, likert: 2 },
      'culture':            { maturity: 2, likert: 3 },
      'economic':           { maturity: 3, likert: 3 },
      'stakeholders':       { maturity: 2, likert: 2 },
      'support':            { maturity: 1, likert: 2 },
      'impact-measurement': { maturity: 2, likert: 2 },
    },
    narratives: {
      'gov-q3': 'Our CIC board has 4 directors: 2 founders (a software developer and a social worker), 1 tech industry representative, and 1 community representative from the Dublin Inner City Partnership. We do not yet have participant representation on the board, which we recognise as a gap. The community interest test requires annual CIC reports to the Companies Registration Office.',
      'gov-q4': 'We file our annual CIC report and accounts with the CRO, which are publicly accessible. We share quarterly updates with our funders (Rethink Ireland, Dublin City Council). Internal communication is through Slack channels accessible to all staff and participants. We plan to develop a more comprehensive impact report from 2026.',
      'gov-q5': 'When choosing which coding bootcamp curriculum to adopt, we held a session with current and former participants to test two options. Their strong preference for a project-based approach over lecture-based learning directly shaped our programme design. However, the final procurement decision was made by the founders.',
      'sm-q3': 'Our mission is to create pathways into the digital economy for people from disadvantaged Dublin communities, particularly early school leavers, lone parents, and Traveller community members. We provide web development training, IT support services, and digital literacy programmes. We work with approximately 20 participants per cohort, running 2 cohorts per year.',
      'sm-q4': 'From our 3 completed cohorts (60 participants total), 15 have entered employment in tech roles (web development, IT support, QA testing), 8 have entered further education (TU Dublin, SOLAS courses), and 12 are freelancing through our supported marketplace. We track outcomes at 3, 6, and 12 months post-completion but acknowledge our follow-up data has gaps.',
      'sm-q5': 'Beyond direct employment outcomes, our participants have built websites for 25 local community organisations and small businesses at no cost. This creates a multiplier effect: participants gain real portfolio projects while community organisations get professional digital presence they could not otherwise afford. Several participants have been hired directly by organisations they built websites for.',
      'emp-q3': 'Our 6-month programme includes 12 weeks of intensive web development training (HTML, CSS, JavaScript, React), 4 weeks of soft skills and employability (professional communication, teamwork, interview skills), and 8 weeks of supported project work where participants build real websites for community clients. Participants receive a QQI Level 5 Certificate in Software Development upon completion.',
      'emp-q4': 'Of our 2024 cohorts (40 participants), 12 entered tech employment, 4 entered further education, 8 are active freelancers, 6 dropped out during the programme, and 10 completed but have not yet achieved a positive outcome. The 15% dropout rate concerns us — it is mostly due to personal crises (childcare breakdown, housing instability) rather than academic difficulty.',
      'emp-q5': 'Kevin, a former drug user from Dublin\'s north inner city, had not worked in 8 years when he joined our programme. He struggled initially with the intensity but found his niche in front-end design. His portfolio project — a website for a local boxing club — won our cohort showcase award. He was hired as a junior developer by a Dublin agency and has been employed for 14 months.',
      'cul-q3': 'We maintain an inclusive culture grounded in respect for diverse backgrounds. Given that our participants include Travellers, people with criminal records, and people in recovery, we work to create a stigma-free environment. We do not ask about personal histories beyond what participants choose to share. Our code of conduct emphasises mutual respect, punctuality, and commitment to learning.',
      'cul-q4': 'Our small team (3 permanent staff, 2 contract trainers) works closely together. Staff development includes conference attendance and online learning budgets. We do not yet have formal supervision or wellbeing support. The founders acknowledge that they are stretched thin, managing both programme delivery and organisational development with limited management capacity.',
      'cul-q5': 'After a participant shared that he felt anxious about group presentations (a common PTSD response), we introduced the option of recording video presentations as an alternative to live presenting. This accommodation was so popular that we now offer it as a standard option, and several participants who initially chose recorded presentations have gradually built up to live ones.',
      'eco-q3': 'Revenue is approximately 40% service income (website development for community organisations and SMEs, IT support contracts), 35% grant funding (Rethink Ireland Social Enterprise Development Fund, Dublin City Council Community Grant), and 25% programme fees (funded by SOLAS/ETB training budgets for participants, not charged directly). We aim for 60% earned income by 2027.',
      'eco-q4': 'We maintain a rolling 12-month financial plan and report monthly to our Rethink Ireland impact investor. Cash reserves are modest (approximately 2 months operating costs). Key risks: dependency on Rethink Ireland investment (which has a defined 3-year term ending 2027), rapid pace of tech change requiring constant curriculum updates, and competition from commercial coding bootcamps.',
      'eco-q5': 'Digital Bridge started with a €5,000 personal investment and a Social Enterprise Seed Award from Dublin City Council. Through winning the Rethink Ireland Social Enterprise Development Fund, we secured €200,000 over 3 years plus business development support. Our commercial revenue has grown from €15,000 in year 1 to €80,000 in year 3, driven by our website development service.',
      'stk-q3': 'Partners include Rethink Ireland (investment and capacity building), Dublin City Council (funding and referrals), SOLAS/City of Dublin ETB (programme accreditation and participant funding), Dublin Inner City Partnership (community links), TU Dublin (progression pathway), and several tech companies that provide mentors (Intercom, Stripe, HubSpot).',
      'stk-q4': 'We are members of Social Enterprise Republic of Ireland (SERI) and have participated in the EU Social Economy Gateway pilot. We attended the Social Enterprise World Forum 2024 in Amsterdam. We are interested in EU partnerships, particularly with similar digital inclusion WISEs in France (Simplon) and Spain (Fundación Tomillo), but have not yet established formal connections.',
      'stk-q5': 'Our mentorship partnership with Intercom (tech company) began when their head of engineering attended our graduation. They now provide monthly mentoring sessions, donate refurbished laptops, and offer 2 annual internships for our graduates. This partnership bridges the gap between our community-based programme and the professional tech industry, making the transition less daunting for participants.',
      'sup-q3': 'We provide coding training, career coaching (1:10 ratio), and access to loaned laptops for the programme duration. We refer to external services for mental health (Jigsaw youth mental health), addiction (local HSE services), and housing (Dublin Simon Community). We provide LEAP card top-ups for transport. Support is provided by staff who combine technical and pastoral roles.',
      'sup-q4': 'Our training centre is accessible (ground floor, lift available). We provide assistive technology for participants with learning disabilities (screen readers, speech-to-text). Classes are in English; one staff member speaks Irish and basic Polish. We accommodate flexible attendance for participants with childcare or health needs, with recordings available for missed sessions. We acknowledge limited capacity for intensive personal support.',
      'sup-q5': 'When we discovered that several participants did not have reliable internet access at home for study, we kept our training centre open as a "digital hub" 3 evenings per week. This simple intervention — providing a warm, connected space — improved homework completion rates and created an informal study community where participants help each other.',
      'im-q3': 'We track programme completion, employment outcomes (role, employer, salary range), further education entries, and freelance activity. Data is collected through our CRM (HubSpot, donated licence) and exit surveys. We report quarterly to Rethink Ireland using their standardised social impact metrics. We conduct 6-month and 12-month follow-up calls with graduates.',
      'im-q4': 'Our data showed that participants with some prior self-taught coding experience progressed faster and had higher employment rates. This led us to introduce a 2-week "pre-bootcamp" for complete beginners, giving them a foundation before the intensive programme starts. Early results suggest this has reduced the dropout rate in the first 4 weeks by approximately half.',
      'im-q5': 'Our Rethink Ireland reporting requirements pushed us to develop better impact measurement than we would have done otherwise. We now have a dashboard showing participant demographics, progression, and outcomes. However, we recognise that our qualitative data collection (participant experiences, barriers, enablers) is underdeveloped. We plan to add structured interviews to our evaluation process in 2026.',
    },
  },
];

// ─── Action plan generation helper ───
function generateActionPlans(assessmentId: string, domainScoresMap: Record<string, number>) {
  const items: Array<{
    assessmentId: string;
    domainKey: string;
    domainName: string;
    priority: string;
    recommendation: string;
    description: string;
    effort: string;
    impact: string;
    timeframe: string;
    currentLevel: string;
    targetLevel: string;
  }> = [];

  // Sort domains by score ascending (weakest first)
  const sorted = Object.entries(domainScoresMap).sort((a, b) => a[1] - b[1]);

  for (const [dk, score] of sorted) {
    const current = maturityLevel(score);
    const templates = RECOMMENDATION_TEMPLATES.filter(
      (t) => t.domainKey === dk && t.currentLevel === current
    );
    if (templates.length === 0) continue;

    const priority = score < 2 ? 'high' : score < 3 ? 'medium' : 'low';
    const tmpl = templates[0];

    items.push({
      assessmentId,
      domainKey: dk,
      domainName: DOMAINS[dk].name,
      priority,
      recommendation: tmpl.recommendation,
      description: tmpl.description,
      effort: tmpl.effort,
      impact: tmpl.impact,
      timeframe: tmpl.timeframe,
      currentLevel: tmpl.currentLevel,
      targetLevel: tmpl.targetLevel,
    });
  }
  return items;
}

// ─── Main seed function ───
async function main() {
  console.log('Seeding demo assessment data...\n');

  for (const org of DEMO_ORGS) {
    console.log(`Creating: ${org.name} (${org.country})`);

    // 1. Create organisation
    const organisation = await prisma.organisation.upsert({
      where: { accessCode: org.accessCode },
      update: {
        name: org.name,
        country: org.country,
        region: org.region,
        sector: org.sector,
        size: org.size,
        legalStructure: org.legalStructure,
      },
      create: {
        name: org.name,
        accessCode: org.accessCode,
        country: org.country,
        region: org.region,
        sector: org.sector,
        size: org.size,
        legalStructure: org.legalStructure,
      },
    });

    // 2. Create assessment
    const domainScoresMap: Record<string, number> = {};
    for (const [dk, vals] of Object.entries(org.scores)) {
      domainScoresMap[dk] = domainScore(vals.maturity, vals.likert);
    }
    const overall =
      Math.round(
        (Object.values(domainScoresMap).reduce((a, b) => a + b, 0) /
          Object.values(domainScoresMap).length) *
          100
      ) / 100;

    // Check if assessment already exists for this org
    const existingAssessment = await prisma.assessment.findFirst({
      where: { organisationId: organisation.id, status: 'completed' },
    });

    let assessment;
    if (existingAssessment) {
      assessment = await prisma.assessment.update({
        where: { id: existingAssessment.id },
        data: {
          status: 'completed',
          overallScore: overall,
          completedAt: new Date(org.completedAt),
        },
      });
    } else {
      assessment = await prisma.assessment.create({
        data: {
          organisationId: organisation.id,
          status: 'completed',
          overallScore: overall,
          completedAt: new Date(org.completedAt),
        },
      });
    }

    // 3. Create responses for all 40 questions
    for (const [dk, vals] of Object.entries(org.scores)) {
      const meta = DOMAINS[dk];
      const qPrefix = meta.qPrefix;

      // q1 = maturity
      const q1Id = `${qPrefix}-q1`;
      await prisma.response.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId: assessment.id,
            questionId: q1Id,
          },
        },
        update: { numericValue: vals.maturity },
        create: {
          assessmentId: assessment.id,
          domainKey: dk,
          questionId: q1Id,
          questionType: 'maturity',
          numericValue: vals.maturity,
        },
      });

      // q2 = likert
      const q2Id = `${qPrefix}-q2`;
      await prisma.response.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId: assessment.id,
            questionId: q2Id,
          },
        },
        update: { numericValue: vals.likert },
        create: {
          assessmentId: assessment.id,
          domainKey: dk,
          questionId: q2Id,
          questionType: 'likert',
          numericValue: vals.likert,
        },
      });

      // q3, q4, q5 = narrative
      for (let qi = 3; qi <= 5; qi++) {
        const qId = `${qPrefix}-q${qi}`;
        const text = org.narratives[qId];
        if (!text) continue;

        await prisma.response.upsert({
          where: {
            assessmentId_questionId: {
              assessmentId: assessment.id,
              questionId: qId,
            },
          },
          update: { textValue: text },
          create: {
            assessmentId: assessment.id,
            domainKey: dk,
            questionId: qId,
            questionType: 'narrative',
            textValue: text,
          },
        });
      }
    }

    // 4. Create domain scores
    for (const [dk, score] of Object.entries(domainScoresMap)) {
      await prisma.domainScore.upsert({
        where: {
          assessmentId_domainKey: {
            assessmentId: assessment.id,
            domainKey: dk,
          },
        },
        update: { score, maturityLevel: maturityLevel(score) },
        create: {
          assessmentId: assessment.id,
          domainKey: dk,
          score,
          maturityLevel: maturityLevel(score),
        },
      });
    }

    // 5. Generate action plans
    await prisma.actionPlan.deleteMany({
      where: { assessmentId: assessment.id },
    });
    const actionItems = generateActionPlans(assessment.id, domainScoresMap);
    for (const item of actionItems) {
      await prisma.actionPlan.create({ data: item });
    }

    console.log(
      `  ✓ ${org.name}: overall ${overall} (${maturityLevel(overall)}), ${actionItems.length} action plan items`
    );
  }

  console.log('\nDemo data seeding complete!');
  console.log(`Created ${DEMO_ORGS.length} organisations with completed assessments.`);
  console.log('\nAccess codes:');
  for (const org of DEMO_ORGS) {
    console.log(`  ${org.accessCode} → ${org.name}`);
  }
  console.log('\nDashboard codes: DASH-DEMO2025 (policymaker), DASH-RESEARCH (researcher)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
