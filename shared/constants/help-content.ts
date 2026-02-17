// ─── Contextual Help Content ───
// Per-question help text, domain-specific maturity examples, and example narrative responses.

export interface QuestionHelp {
  /** Simple explanation of what the question is really asking */
  plainLanguage: string;
  /** EU framework context explained accessibly */
  frameworkReference: string;
  /** Example response for narrative questions */
  exampleResponse?: string;
}

export interface DomainMaturityExample {
  domainKey: string;
  level: number;
  example: string;
}

// ─── Per-Question Help ───

export const QUESTION_HELP: Record<string, QuestionHelp> = {
  // ─── Governance & Democracy ───
  'gov-q1': {
    plainLanguage: 'Rate how well your organisation makes decisions democratically. Think about whether all stakeholders have a voice, not just those with financial power.',
    frameworkReference: 'The EMES Network — Europe\'s leading research network on social enterprises — says WISEs should be controlled democratically, not by whoever owns the most shares. The EU Council (2023) agrees: governance should be transparent and accountable.',
  },
  'gov-q2': {
    plainLanguage: 'Do the people your WISE supports (workers, trainees) actually get a say in how things are run? This ranges from "no input at all" to "they vote on major decisions".',
    frameworkReference: 'The EU believes social enterprises should involve the people they serve in governance. This is a core principle of the social economy — it\'s what makes WISEs different from regular businesses.',
  },
  'gov-q3': {
    plainLanguage: 'Tell us who sits on your board and how they got there. The EU wants to see boards that include different perspectives — not just managers or funders.',
    frameworkReference: 'Italian social cooperative law (381/1991) is a good model: it requires boards to include worker representatives. The EU Social Economy Action Plan encourages all Member States to support this kind of multi-stakeholder governance.',
    exampleResponse: 'Our board of 9 includes 2 participant representatives (elected annually by current trainees), 3 community members, 2 staff representatives, and 2 independent directors with relevant expertise. Participant representatives have full voting rights on all matters including budgets. We hold quarterly board meetings with minutes published to all stakeholders.',
  },
  'gov-q4': {
    plainLanguage: 'How do people know what\'s happening in your organisation? Think about published reports, open finances, complaint procedures, and public accountability.',
    frameworkReference: 'The EU Social Economy Action Plan (2021) says social enterprises should publish what they do and how they spend money. Being independent from government while still being accountable is key — this is what EMES calls "autonomy with accountability".',
    exampleResponse: 'We publish an annual report with full financial statements and social impact data, available on our website. We hold an annual stakeholder meeting open to participants, staff, partners, and the public. We have a formal complaints procedure with an independent mediator. Board meeting minutes (redacted for confidentiality) are shared with all staff and participant representatives within 2 weeks.',
  },
  'gov-q5': {
    plainLanguage: 'Share a real story about a time when you asked different groups of people for their opinions before making an important decision.',
    frameworkReference: 'This demonstrates participatory governance in action — the EU principle that decisions should be made with the people affected, not just for them.',
    exampleResponse: 'When we decided to add a new catering social enterprise arm, we held consultation sessions with current participants, staff, local employers, and community members. Participants were particularly concerned about working conditions and training quality. Their feedback led us to include accredited food hygiene qualifications and limit shifts to 6 hours to accommodate those managing health conditions. The final business plan was approved by the board with participant representative votes.',
  },

  // ─── Social Mission & Impact ───
  'sm-q1': {
    plainLanguage: 'How clear and well-developed is your social mission? A strong WISE has a clear purpose focused on helping people who struggle to find work, and can show evidence of impact.',
    frameworkReference: 'The EU defines WISEs specifically as organisations whose main goal is helping people who face serious barriers to employment through real, productive work — not just training or volunteering. ENSIE promotes standardised ways to measure this impact across Europe.',
  },
  'sm-q2': {
    plainLanguage: 'When money is tight, does your organisation prioritise helping people into work (social mission) or maximising revenue? A score of 5 means social outcomes always come first.',
    frameworkReference: 'The European Pillar of Social Rights says everyone has a right to support in finding employment. WISEs are key to delivering this — which means the social mission must genuinely drive decisions, not just appear in the brochure.',
  },
  'sm-q3': {
    plainLanguage: 'Describe who you help and why they need your support. Be specific about the barriers they face — long-term unemployment, disability, migration, criminal record, or other challenges.',
    frameworkReference: 'The EU recognises WISEs as serving people "at risk of permanent exclusion from the labour market." This aligns with UN Sustainable Development Goals on poverty (SDG 1), decent work (SDG 8), and reducing inequalities (SDG 10).',
    exampleResponse: 'Our mission is to provide transitional employment and accredited skills training for long-term unemployed adults (12+ months) in our region, with a focus on those with mental health conditions and refugees with right-to-work status. In 2024, 68% of our 45 participants had been unemployed for more than 2 years, 40% had diagnosed mental health conditions, and 25% were refugees. We operate a furniture restoration workshop and community cafe as our productive activities.',
  },
  'sm-q4': {
    plainLanguage: 'What concrete results have you achieved in the past year? Include numbers where possible — how many people supported, how many moved into jobs, what qualifications were gained.',
    frameworkReference: 'ENSIE\'s Impact-WISEs framework gives guidance on what outcomes to measure, so WISEs across Europe can compare results. Think about employment outcomes, skills gained, wellbeing improvements, and progression.',
    exampleResponse: 'In the past 12 months: 45 participants enrolled (target: 40), 18 moved into open-market employment (40% transition rate), 12 achieved NVQ Level 2 qualifications, average time-to-employment was 7 months. Participant wellbeing scores (WEMWBS) improved by an average of 8 points. 85% of those placed in employment retained their positions at 6 months. We also supported 8 participants into further education.',
  },
  'sm-q5': {
    plainLanguage: 'Beyond helping individual participants, how does your organisation benefit the wider community? Think about economic contribution, social connections, environmental impact, or advocacy.',
    frameworkReference: 'The EU Social Economy Action Plan sees social enterprises as drivers of "inclusive growth" — benefiting whole communities, not just the people directly involved.',
    exampleResponse: 'Our community cafe serves as a neighbourhood hub, hosting weekly community meals and a food bank partnership reaching 120 families. Our furniture restoration diverts 15 tonnes of waste from landfill annually. We employ 12 permanent staff from the local area. Through our advocacy work with the regional social enterprise network, we helped shape the new local authority social procurement policy, which now reserves 10% of contracts for social enterprises.',
  },

  // ─── Employment Pathways ───
  'emp-q1': {
    plainLanguage: 'How mature are your employment programmes? Think about whether you offer real jobs with real skills, clear progression routes, and genuine pathways to independent employment.',
    frameworkReference: 'Different EU countries have different models: France uses "social insertion through economic activity" (SIAE), Spain has "insertion enterprises" with personalised plans, Italy integrates disadvantaged workers directly into cooperatives. Your model may draw on one or more of these approaches.',
  },
  'emp-q2': {
    plainLanguage: 'Do your participants gain recognised qualifications? A score of 5 means you offer comprehensive accredited training with individual development plans linked to European qualification standards.',
    frameworkReference: 'The European Qualifications Framework (EQF) allows qualifications to be compared across EU countries. ESF+ funding emphasises the importance of giving people transferable, recognised skills — not just work experience.',
  },
  'emp-q3': {
    plainLanguage: 'Explain how your employment model works — what jobs do people do, what are they paid, how do they progress, and how do you help them move into the open job market?',
    frameworkReference: 'EU models range from sheltered workshops to fully competitive employment. France\'s chantiers d\'insertion offer transitional work, Spain\'s Empresas de Inserción create personalised integration journeys, and Italy\'s Type B cooperatives integrate workers directly into productive businesses.',
    exampleResponse: 'We operate a 12-month transitional employment programme through our furniture restoration workshop. Participants work 20 hours/week (expanding to 30 hours as they progress), paid at minimum wage. Each person has an Individual Development Plan reviewed monthly. Months 1-3 focus on work readiness and basic skills, months 4-8 on accredited training (City & Guilds woodwork), months 9-12 on job search support with 2-week employer placements. We also offer ongoing supported employment for 5 participants with significant disabilities who prefer to remain with us long-term.',
  },
  'emp-q4': {
    plainLanguage: 'What happens to people after they leave your programme? How many get jobs? How many keep those jobs after 6 or 12 months? What kinds of jobs do they get?',
    frameworkReference: 'Transition-to-work rates are a key measure of WISE effectiveness across Europe. ENSIE collects this data to understand how different models perform. ESF+ programme evaluations also track these outcomes.',
    exampleResponse: 'Of 30 participants who completed our programme in the past 12 months: 18 (60%) transitioned to open-market employment, 5 (17%) entered further education/training, 4 (13%) moved to other supported employment, 3 (10%) were seeking employment. Of those employed, 14 (78%) remained in their positions at 6 months. Employment sectors: hospitality (6), retail (4), manufacturing (3), construction (3), other (2). Average starting wage was 8% above minimum wage.',
  },
  'emp-q5': {
    plainLanguage: 'Tell the story of one participant\'s journey through your organisation — from when they arrived to where they are now. Change names and identifying details to protect privacy.',
    frameworkReference: 'EU social insertion models emphasise personalised integration journeys. This example should illustrate how your programme adapts to individual needs and circumstances.',
    exampleResponse: '"Maria" joined our programme after 3 years of unemployment following a period of homelessness. She started in our cafe on 15 hours/week, with significant anxiety about workplace interactions. Her Individual Development Plan included confidence-building workshops, a mentor (a former participant), and gradual increase in customer-facing tasks. After 4 months, she began Food Hygiene Level 2 training. At 8 months, she did a 2-week placement at a local restaurant. After 11 months, she was offered a permanent part-time position there. She has now been employed for 8 months and recently started Level 3 training.',
  },

  // ─── Organisational Culture ───
  'cul-q1': {
    plainLanguage: 'How well does your organisation actually live its values of inclusion and respect? Think about whether people feel safe, valued, and in control of their own experience.',
    frameworkReference: 'The EU Charter of Fundamental Rights enshrines human dignity (Article 1), non-discrimination (Article 21), and integration of people with disabilities (Article 26). Trauma-informed practice — understanding how past experiences affect people — is increasingly recognised as essential in European social work.',
  },
  'cul-q2': {
    plainLanguage: 'Can participants genuinely shape their own work experience, or is everything decided for them? A score of 5 means participants co-design how things work.',
    frameworkReference: 'The EU Charter (Article 15: Freedom to choose an occupation) and the European Pillar of Social Rights both say people should have meaningful input into their working life. In a WISE, this means participants should be active agents, not passive recipients.',
  },
  'cul-q3': {
    plainLanguage: 'Describe what dignity and respect look like in your day-to-day operations. How do you handle discrimination? How do you create a safe environment for people who may have experienced trauma?',
    frameworkReference: 'European social work traditions emphasise trauma-informed approaches — recognising that many WISE participants have experienced adversity that affects how they engage with services. The EU Charter protects dignity, prohibits discrimination, and promotes equality.',
    exampleResponse: 'All staff complete mandatory trauma-informed practice training (2 days) and annual refresher sessions. We use person-first language in all communications. Our "dignity charter" — co-written with participants — is displayed throughout the workplace and covers respectful communication, privacy, and right to refuse tasks. We have a zero-tolerance discrimination policy with clear reporting routes. The physical environment includes quiet spaces for those managing anxiety, prayer/reflection rooms, and accessible facilities throughout.',
  },
  'cul-q4': {
    plainLanguage: 'How do you look after the people who look after participants? Staff burnout is a real risk in WISEs — what training, support, and wellbeing measures are in place?',
    frameworkReference: 'European frameworks recognise that frontline staff in WISEs need ongoing professional development and support to maintain quality of care. Trauma-informed practice isn\'t just for participants — staff need it too.',
    exampleResponse: 'All staff receive monthly individual supervision (1 hour) and quarterly group supervision facilitated by an external clinical supervisor. We provide 5 CPD days per year plus access to a training budget. Staff wellbeing measures include an Employee Assistance Programme, flexible working arrangements, and regular team wellbeing check-ins. We conduct annual staff satisfaction surveys with results acted on transparently. Staff turnover last year was 12%, below the social care sector average of 28%.',
  },
  'cul-q5': {
    plainLanguage: 'Tell us about a time when participants said something and it actually changed how your organisation works. This shows whether participant voice is real or just a box-ticking exercise.',
    frameworkReference: 'The EU rights-based approach says service users should be active agents in shaping services — not passive recipients. This question asks you to prove it with a real example.',
    exampleResponse: 'Participants raised concerns through our monthly "Voice Forum" that the 8am start time was a barrier for those with childcare responsibilities and those attending morning medical appointments. After a facilitated discussion, participants proposed a flexible start window (8-10am) with core hours of 10am-3pm. This was approved by the management team and has been in operation for 6 months. Attendance has improved by 15%, and participant satisfaction scores for "feeling respected" increased from 3.6 to 4.2 out of 5.',
  },

  // ─── Economic Sustainability ───
  'eco-q1': {
    plainLanguage: 'How financially healthy and sustainable is your organisation? Think about whether you have diverse income sources, good financial planning, and a viable long-term model.',
    frameworkReference: 'European WISEs typically get money from multiple sources: about 43% from public authorities, 38% from business clients, and 20% from individuals. EU rules on state aid and social procurement shape how WISEs earn and receive money.',
  },
  'eco-q2': {
    plainLanguage: 'What percentage of your income comes from selling goods/services (as opposed to grants and subsidies)? This isn\'t about being "more commercial = better" — many excellent WISEs rely heavily on public funding, and that\'s fine. It\'s about understanding your funding mix.',
    frameworkReference: 'ENSIE data shows European WISEs average about 57% from market sources. The "right" balance depends on your context — some national systems provide more public funding than others, and this is a legitimate part of the WISE model.',
  },
  'eco-q3': {
    plainLanguage: 'Explain how you earn money and how you balance making enough to survive with staying true to your social mission. Include any EU funding you use.',
    frameworkReference: 'The EU offers several funding mechanisms for WISEs: social procurement (Directive 2014/24/EU allows councils to reserve contracts for WISEs), ESF+ for employment programmes, and InvestEU for investment. Many national governments also have specific WISE subsidy schemes.',
    exampleResponse: 'Our revenue model blends earned income (55%) with public funding (35%) and grants (10%). Earned income comes from our furniture restoration sales (€180k/year) and cafe operations (€120k/year). Public funding includes an ESF+ employment integration contract (€150k/year) and local authority supported employment funding (€50k/year). We price our products competitively while ensuring fair wages. All commercial decisions are reviewed against our mission impact criteria — we turned down a large corporate contract last year because the delivery timeline would have compromised participant training time.',
  },
  'eco-q4': {
    plainLanguage: 'How do you plan for the future financially? What happens if a major funder cuts your budget? Do you have reserves? How do you manage financial risk?',
    frameworkReference: 'WISEs face particular financial risks: dependency on public procurement cycles, changes in ESF+ funding periods (currently 2021-2027), state aid compliance requirements, and the tension between being competitive and fulfilling social objectives.',
    exampleResponse: 'We maintain a 3-month operating reserve (currently €95k). We conduct annual financial scenario planning including a "worst case" model if our largest funder withdraws. We diversify income sources — no single funder exceeds 25% of revenue. We have a 3-year business plan reviewed annually. Our finance committee meets monthly and includes a board member with social enterprise finance expertise. We are exploring social investment options through the InvestEU social window for our planned expansion.',
  },
  'eco-q5': {
    plainLanguage: 'How has your business model changed over time, and what\'s your plan for the next few years? What opportunities do you see in the current EU policy landscape?',
    frameworkReference: 'The EU Social Economy Action Plan (2021) creates new opportunities for WISEs: growing social procurement, InvestEU social investment, and increasing recognition in EU structural funds. Smart WISEs are positioning themselves to benefit from these developments.',
    exampleResponse: 'When we started in 2015, we were 80% grant-funded. We\'ve systematically developed our commercial activities — opening the cafe in 2018 and launching online furniture sales in 2022. We\'re now 55% earned income. Our 3-year plan targets 65% earned income by developing a social franchise model for our cafe concept. We\'re applying for InvestEU social window investment to fund this expansion. We\'re also working with our local authority to develop a social procurement framework that could provide additional contract opportunities for WISEs in our region.',
  },

  // ─── Stakeholder Engagement ───
  'stk-q1': {
    plainLanguage: 'How well-connected is your organisation? Think about relationships with employers, community groups, government, and networks of other WISEs — both locally and across Europe.',
    frameworkReference: 'Key European WISE networks include ENSIE (the main European WISE network), RREUSE (for reuse/recycling social enterprises), CECOP-CICOPA (for cooperatives), and the Euclid Network. The EU Social Economy Gateway is a useful resource for finding connections.',
  },
  'stk-q2': {
    plainLanguage: 'Do you work with employers to create jobs and placements for your participants? A score of 5 means deep, ongoing partnerships where employers help design roles and provide continued support.',
    frameworkReference: 'European WISEs increasingly go beyond simple placements to develop genuine employer partnerships. The best models involve employers in understanding barriers to employment and co-designing inclusive workplaces.',
  },
  'stk-q3': {
    plainLanguage: 'Describe your most important partnerships. Who do you work with, how did these relationships develop, and what do they achieve for your participants?',
    frameworkReference: 'EU-funded projects like Horizon Europe, Erasmus+ KA2, and ESF+ transnational cooperation offer opportunities for cross-border partnerships. The EU Social Economy Gateway helps identify potential partners.',
    exampleResponse: 'Our key partnerships include: 5 employer partners who provide work placements and priority hiring (restaurant chain, hotel group, 2 social enterprises, council parks department); local mental health trust providing in-reach counselling; Job Centre Plus for referrals and co-funded support; a city college for accredited training delivery on-site; ENSIE membership providing European peer learning. We also participate in an Erasmus+ KA2 project with WISEs in Belgium, Italy, and France on best practice in transitional employment.',
  },
  'stk-q4': {
    plainLanguage: 'Are you connected to the wider WISE and social enterprise movement? Do you share knowledge, advocate for policy changes, or learn from peers across Europe?',
    frameworkReference: 'Networks like ENSIE, RREUSE, and CECOP-CICOPA connect WISEs across Europe for peer learning and collective advocacy. The EU Social Economy Action Plan encourages this kind of sector engagement.',
    exampleResponse: 'We are active members of ENSIE and attend the annual conference. We participate in our national social enterprise federation\'s policy working group, where we contributed to our country\'s response to the EU Social Economy Action Plan consultation. We share our impact data through ENSIE\'s data collection framework. We host 3-4 study visits per year from other WISEs and have a formal peer mentoring relationship with a WISE in another EU Member State through the Euclid Network\'s peer learning programme.',
  },
  'stk-q5': {
    plainLanguage: 'Tell us about one partnership that has made a real difference to what you achieve. What happened, and what impact did it have?',
    frameworkReference: 'This could be a local employer partnership, a cross-border EU project, involvement in a network like ENSIE, or a community collaboration that enhanced your social insertion outcomes.',
    exampleResponse: 'Our partnership with a local hotel chain began in 2021 when their HR director attended one of our open days. We co-designed a "Bridge to Hospitality" programme: participants spend 8 months in our cafe developing customer service skills, then do 4 weeks of paid work experience at the hotel. The chain adapted their onboarding process based on our advice about supporting people with employment gaps. In 3 years, 22 participants have completed placements, 15 were hired permanently, and 12 are still employed. The hotel chain has since adopted similar programmes at 3 other sites, each partnering with a local WISE.',
  },

  // ─── Support Infrastructure ───
  'sup-q1': {
    plainLanguage: 'How comprehensive is the support you provide beyond the job itself? Think about mentoring, counselling, housing help, language support, and how support adapts as people progress.',
    frameworkReference: 'European WISE models vary: France uses "socio-professional accompaniment" (integrated support workers), Germany\'s Werkstätten offer structured progression, and Italian cooperatives wrap social services into the workplace. The best models provide holistic, individualised support.',
  },
  'sup-q2': {
    plainLanguage: 'Is support tailored to each individual and does it reduce gradually as they become more independent? A score of 5 means each person has a personalised support plan that adapts over time.',
    frameworkReference: 'The French accompagnement socioprofessionnel model is a European benchmark: dedicated workers provide intensive support that gradually reduces as participants build confidence and skills. Support should remain available even after transition to independent employment.',
  },
  'sup-q3': {
    plainLanguage: 'What support do you provide directly, and what do you connect people to? Think about everything from work skills to housing, health, legal advice, and financial support.',
    frameworkReference: 'European WISE best practice includes holistic support: France\'s SIAE structures have dedicated accompaniment workers, Italian cooperatives integrate social workers, and Germany\'s Werkstätten offer structured progression through different support levels.',
    exampleResponse: 'In-house services: dedicated key worker for each participant (caseload max 12), weekly 1-to-1 sessions, group skills workshops (IT, budgeting, interview skills), peer mentoring programme, on-site counsellor (2 days/week). External referrals: housing advice service (established SLA), NHS mental health services (direct referral pathway), Citizens Advice for debt/legal issues, ESOL classes at local college. Each participant has a holistic support plan reviewed monthly, with support intensity reducing from weekly to fortnightly to monthly as they progress.',
  },
  'sup-q4': {
    plainLanguage: 'Can everyone access your services equally? Think about physical accessibility, language barriers, cultural sensitivity, disability accommodation, and people with multiple complex needs.',
    frameworkReference: 'The EU Charter of Fundamental Rights (Article 26) requires integration of people with disabilities. The European Accessibility Act sets minimum standards. European social work emphasises addressing the whole person — recognising that barriers to employment often intersect with health, housing, language, and discrimination.',
    exampleResponse: 'Our premises are fully wheelchair accessible with adapted workstations. We provide interpretation in 4 languages (through a community interpreting service) and ESOL support on-site. Our intake assessment identifies all barriers, not just employment ones — we routinely screen for housing instability, health needs, and caring responsibilities. We have specific expertise in supporting people with learning disabilities (Easy Read materials, visual task boards) and those with mental health conditions (flexible attendance, quiet workspaces, crisis protocols). 30% of our current participants have 3 or more identified complex needs.',
  },
  'sup-q5': {
    plainLanguage: 'Tell a story about how your support made a crucial difference for someone with complex needs. Show how different types of support came together to help them progress. Protect their identity.',
    frameworkReference: 'European WISE practice recognises that effective support for people with complex barriers often means coordinating multiple services — housing, health, legal, language — alongside employment support. This is what holistic accompaniment looks like in practice.',
    exampleResponse: '"Ahmed" arrived as a refugee with PTSD, limited English, and no recognised qualifications despite being a trained mechanic. His support plan integrated: ESOL classes (3x/week at partner college), trauma-focused CBT (via NHS referral, sessions arranged around his work schedule), housing support (our key worker helped him apply for stable accommodation), and a graduated work programme in our workshop. He started on 10 hours/week, increasing to 25 hours over 6 months as his confidence grew. His key worker coordinated with his therapist to ensure his work tasks supported his recovery. After 9 months, he achieved an accredited vehicle maintenance qualification and moved into a role with a local garage, with 3 months of post-placement support.',
  },

  // ─── Impact Measurement & Learning ───
  'im-q1': {
    plainLanguage: 'How good is your organisation at measuring its impact and learning from the data? Think about what data you collect, how you analyse it, and whether it actually changes how you work.',
    frameworkReference: 'The EU Social Economy Action Plan (2021) calls for better impact measurement across social enterprises. ENSIE\'s Impact-WISEs framework provides standardised indicators for comparing WISE outcomes across Europe. ESEM (European Social Enterprise Monitor) offers broader benchmarks.',
  },
  'im-q2': {
    plainLanguage: 'Do you collect outcome data and actually use it to improve? A score of 5 means you have comprehensive data systems using recognised frameworks, with regular analysis that drives service improvements.',
    frameworkReference: 'The EU push for standardised impact measurement aims to help WISEs compare results and learn from each other. Key frameworks include SROI (Social Return on Investment) and Theory of Change.',
  },
  'im-q3': {
    plainLanguage: 'Explain how you measure your social impact. What tools and frameworks do you use? What data do you collect, how often, and how do you capture both numbers and stories?',
    frameworkReference: 'European approaches include: SROI for putting a monetary value on social outcomes, Theory of Change for mapping how activities lead to impact, ENSIE\'s Impact-WISEs for standardised WISE indicators, and ESEM for broader social enterprise benchmarking.',
    exampleResponse: 'We use a Theory of Change model mapping our activities to short-term outcomes (skills, confidence), medium-term outcomes (employment, sustained wellbeing), and long-term impact (reduced social exclusion). We collect: quarterly participant outcome data (employment status, qualification attainment, wellbeing scores using WEMWBS), 6-month and 12-month post-exit tracking, annual SROI analysis (our latest figure: €3.40 social value per €1 invested). We contribute data to ENSIE\'s Impact-WISEs collection and benchmark against national social enterprise monitor indicators. Our annual impact report combines quantitative data with participant stories (with consent).',
  },
  'im-q4': {
    plainLanguage: 'How does data actually change what you do? Does evidence inform your strategy, service design, and staff development — or does it just sit in reports?',
    frameworkReference: 'The EU Social Economy Action Plan says social enterprises should develop evidence practices for both accountability and organisational learning. The goal is to build "learning organisations" that continuously improve.',
    exampleResponse: 'Our quarterly review process analyses outcome data by programme, participant group, and support type. Last year, data showed that participants with caring responsibilities had 30% lower completion rates. This led us to introduce flexible hours and a childcare partnership, which improved their completion rate by 22 percentage points. Our SROI analysis identified that peer mentoring delivered the highest social return per euro, leading us to expand the programme. We share anonymised outcome data with staff monthly and use it in supervision to identify which support approaches work best for different participant needs.',
  },
  'im-q5': {
    plainLanguage: 'Give a real example of when your data or research led to a significant improvement. What did the evidence show, what did you change, and what was the result?',
    frameworkReference: 'The EU push for impact measurement is based on the belief that good evidence drives better outcomes. This question asks you to prove it with a concrete example.',
    exampleResponse: 'Our 2023 SROI analysis revealed that our 12-week employment preparation programme had lower returns than expected because many participants weren\'t work-ready when they started. Wellbeing data confirmed this: the first 4 weeks showed minimal improvement in confidence scores. We restructured the programme to include a 4-week "foundations" phase focused on wellbeing, routine-building, and basic skills before employment-focused activities begin. After implementing this change, our transition-to-employment rate increased from 38% to 52%, and participant satisfaction with the programme rose from 3.4 to 4.1 out of 5. We presented these findings at the ENSIE annual conference to share learning with other WISEs.',
  },

  // ─── Environmental Sustainability & Green Transition ───
  'env-q1': {
    plainLanguage: 'How seriously does your organisation take environmental sustainability? Think about whether green practices are part of your strategy, not just an afterthought.',
    frameworkReference: 'The EU Green Deal aims for climate neutrality by 2050, and the European Climate Law makes this legally binding. The WISESHIFT Horizon Europe project (2025-2029) specifically studies how WISEs can be both inclusive AND environmentally sustainable.',
  },
  'env-q2': {
    plainLanguage: 'Do you actually measure your environmental footprint (energy, waste, emissions) and take steps to reduce it? A score of 5 means you have comprehensive data and can show real reductions.',
    frameworkReference: 'The EU Corporate Sustainability Reporting Directive (CSRD) is expanding environmental reporting across Europe. While most WISEs are below the threshold, measuring your impact now positions you as a leader and prepares for future expectations.',
  },
  'env-q3': {
    plainLanguage: 'Explain how your work activities contribute to a greener economy. Many WISEs already do this — repair, reuse, recycling, urban gardening, green maintenance — this is about recognising and articulating that value.',
    frameworkReference: 'The EU Circular Economy Action Plan (2020) promotes reuse, repair, and recycling — sectors where many WISEs already operate. The Right to Repair Directive further supports this. The WISESHIFT project studies exactly this intersection of social and environmental value.',
    exampleResponse: 'Our furniture restoration social enterprise diverts approximately 20 tonnes of furniture from landfill annually. Participants learn repair, upcycling, and woodworking skills while we extend product lifecycles — directly contributing to circular economy goals. We also run a community "Repair Cafe" monthly, teaching basic repair skills to local residents. Our work simultaneously provides employment pathways for long-term unemployed adults and reduces waste, demonstrating the dual social-environmental value model that the WISESHIFT project aims to evidence.',
  },
  'env-q4': {
    plainLanguage: 'Do you help participants and staff develop "green skills" — knowledge about sustainability, energy efficiency, waste reduction, or working in the green economy? These skills are increasingly valuable in the job market.',
    frameworkReference: 'The EU Just Transition framework says the move to a green economy must be fair — creating opportunities for disadvantaged groups, not leaving them behind. WISEs are uniquely positioned to develop green skills among populations at risk of exclusion. The European Skills Agenda lists green skills as a priority.',
    exampleResponse: 'All participants complete a 2-day environmental awareness module covering waste management, energy efficiency, and circular economy principles. In our textile workshop, participants learn sustainable fashion concepts — repair, upcycling, and natural dyeing — which are in growing demand from ethical fashion employers. We\'ve added solar panel installation training (accredited Level 2) in partnership with a local renewable energy company, and 8 participants have gained employment in the green energy sector. We also run community workshops on home energy efficiency, reaching approximately 200 local residents per year.',
  },
  'env-q5': {
    plainLanguage: 'Tell a story that shows how your organisation combines helping people AND helping the environment. This is the core of what makes WISEs special in the green transition — they can do both at once.',
    frameworkReference: 'The WISESHIFT Horizon Europe project is built on the idea that WISEs can be "inclusive AND sustainable by design." This evidence is valuable for EU policy-makers developing the just transition framework.',
    exampleResponse: 'Our community garden project operates on a former industrial site, combining land remediation with work integration. Participants with mental health conditions work in therapeutic horticulture, growing organic vegetables sold through a weekly community box scheme. The project remediates contaminated soil using phytoremediation techniques, provides green skills training in organic growing and composting, produces local food reducing transport emissions, and has become a biodiversity corridor in an urban area. Last year, 12 participants completed horticultural qualifications, 6 moved into employment in parks and gardens, and the site now hosts 15 species of pollinators. The project was cited in our municipality\'s climate action plan as a model of inclusive green urban regeneration.',
  },
};

// ─── Domain-Specific Maturity Level Examples ───
// Concrete examples of what each maturity level looks like in each domain.

export const DOMAIN_MATURITY_EXAMPLES: DomainMaturityExample[] = [
  // Governance
  { domainKey: 'governance', level: 1, example: 'Governance is informal — decisions are made by the founder or a small group without documented processes or stakeholder consultation.' },
  { domainKey: 'governance', level: 2, example: 'A board exists with defined roles and regular meetings, but participant and community representation is limited or advisory only.' },
  { domainKey: 'governance', level: 3, example: 'The board includes participant representatives with voting rights. Decision-making processes are documented. Annual governance reviews occur.' },
  { domainKey: 'governance', level: 4, example: 'Multi-stakeholder governance with strong participant voice. Data-informed decision-making. Governance policies are benchmarked against EU cooperative and social economy standards.' },
  { domainKey: 'governance', level: 5, example: 'Recognised as a governance model for the sector. Participants co-lead strategic planning. Governance innovations are shared through ENSIE/CECOP networks and EU policy forums.' },

  // Social Mission
  { domainKey: 'social-mission', level: 1, example: 'Social mission exists but is vaguely defined. Impact measurement is anecdotal. The link between activities and social outcomes is unclear.' },
  { domainKey: 'social-mission', level: 2, example: 'Mission statement is documented and references specific target groups. Basic outcome tracking is in place (e.g., number of participants).' },
  { domainKey: 'social-mission', level: 3, example: 'Clear mission aligned with EU WISE definitions. Regular impact measurement using defined indicators. Mission informs all major decisions.' },
  { domainKey: 'social-mission', level: 4, example: 'Comprehensive impact measurement using SROI or Theory of Change. Social outcomes demonstrably drive strategy. Evidence shared through ENSIE data collection.' },
  { domainKey: 'social-mission', level: 5, example: 'Sector-leading impact practice. Published SROI analysis. Contributing to EU policy on WISE impact measurement. Peer organisations learn from your approach.' },

  // Employment
  { domainKey: 'employment', level: 1, example: 'Basic work experience is provided but without structured pathways, accredited training, or clear progression toward open employment.' },
  { domainKey: 'employment', level: 2, example: 'Structured work placements with some training. Individual development plans exist but are inconsistent. Some participants transition to open employment.' },
  { domainKey: 'employment', level: 3, example: 'Clear employment pathway with accredited training (EQF-aligned). Individual plans reviewed regularly. Transition rates tracked. Employer partnerships for placements.' },
  { domainKey: 'employment', level: 4, example: 'Comprehensive pathways with multiple options (transitional, supported, open employment). Strong transition rates. Post-employment support. Employer co-design of roles.' },
  { domainKey: 'employment', level: 5, example: 'Innovative employment models replicated by others. Outstanding transition and retention rates. Contributing to EU policy on social insertion. Employer network actively promotes inclusive hiring.' },

  // Culture
  { domainKey: 'culture', level: 1, example: 'Good intentions but inclusion practices are informal. Limited awareness of trauma-informed approaches. Participant feedback mechanisms are basic or absent.' },
  { domainKey: 'culture', level: 2, example: 'Written inclusion policies exist. Some staff have trauma-informed training. Regular participant feedback is collected but not always acted on.' },
  { domainKey: 'culture', level: 3, example: 'Embedded inclusion culture with all staff trained in trauma-informed practice. Active participant voice mechanisms (e.g., forum, surveys). Changes are demonstrably made in response to feedback.' },
  { domainKey: 'culture', level: 4, example: 'Rights-based culture fully embedded. Participants co-design services and policies. Staff wellbeing programme in place. External recognition for inclusive practice.' },
  { domainKey: 'culture', level: 5, example: 'Leading practice in participant agency. Trauma-informed approaches inform all operations. Recognised as a model for the sector. Contributing to European guidelines on inclusive practice.' },

  // Economic
  { domainKey: 'economic', level: 1, example: 'Heavily dependent on a single funding source. Limited financial planning. No reserves policy. Financial sustainability is precarious.' },
  { domainKey: 'economic', level: 2, example: 'Two or more revenue streams. Annual budget in place. Some reserves. Beginning to explore commercial opportunities or social procurement.' },
  { domainKey: 'economic', level: 3, example: 'Diversified income (commercial + public + grants). 3-year business plan. Adequate reserves. Financial management benchmarked against sector standards.' },
  { domainKey: 'economic', level: 4, example: 'Strong commercial revenue alongside strategic public funding. Financial scenario planning. Exploring social investment (InvestEU social window). Profitable social enterprise activities.' },
  { domainKey: 'economic', level: 5, example: 'Innovative financial model replicated by others. Strong reserves and investment strategy. Contributing to EU policy on WISE financing. Financial mentor to other social enterprises.' },

  // Stakeholders
  { domainKey: 'stakeholders', level: 1, example: 'Few external partnerships. Limited employer engagement. Not connected to WISE or social enterprise networks locally or nationally.' },
  { domainKey: 'stakeholders', level: 2, example: 'Some employer relationships for placements. Member of a national network. Beginning to develop community partnerships.' },
  { domainKey: 'stakeholders', level: 3, example: 'Active employer partnerships with regular placements. Connected to national and European networks (ENSIE/RREUSE). Community partnerships are established and productive.' },
  { domainKey: 'stakeholders', level: 4, example: 'Employers co-design roles and recruitment. Active in EU-funded projects (Erasmus+, ESF+). Knowledge-sharing role in sector networks. Advocacy influence on local policy.' },
  { domainKey: 'stakeholders', level: 5, example: 'Strategic partnerships driving systemic change. Leading EU-funded projects. Shaping national and EU social economy policy. Extensive cross-border collaboration network.' },

  // Support
  { domainKey: 'support', level: 1, example: 'Basic work-focused support only. Limited referral networks. One-size-fits-all approach without individualised planning.' },
  { domainKey: 'support', level: 2, example: 'Key worker support with some individualisation. Referral relationships with external services. Developing wrap-around support model.' },
  { domainKey: 'support', level: 3, example: 'Holistic support with individual plans reviewed regularly. Strong referral network. Graduated support that reduces as participants build independence. Accessible facilities.' },
  { domainKey: 'support', level: 4, example: 'Comprehensive accompagnement model with in-house counselling, mentoring, and multi-agency coordination. Post-transition support. Expertise in complex needs.' },
  { domainKey: 'support', level: 5, example: 'Leading practice in holistic accompaniment. Integrated service model replicated by others. Contributing to European approaches to wrap-around support. Research partnership on support effectiveness.' },

  // Impact Measurement
  { domainKey: 'impact-measurement', level: 1, example: 'Data collection is ad hoc. Outcomes are reported anecdotally. No formal impact measurement framework. Learning from data is minimal.' },
  { domainKey: 'impact-measurement', level: 2, example: 'Basic outcome tracking (numbers served, placements made). Some data analysis. Annual report produced. Beginning to adopt a measurement framework.' },
  { domainKey: 'impact-measurement', level: 3, example: 'Regular impact measurement using recognised framework (SROI/ToC). Data analysis informs service improvements. Contributing to sector data collection (ENSIE).' },
  { domainKey: 'impact-measurement', level: 4, example: 'Comprehensive data systems with longitudinal tracking. Published SROI. Evidence-based service design. Feeding into EU-level research on WISE effectiveness.' },
  { domainKey: 'impact-measurement', level: 5, example: 'Pioneering impact measurement approaches. Contributing to development of EU impact measurement standards. Academic research partnerships. Data-driven innovation shared across the sector.' },

  // Environmental Sustainability
  { domainKey: 'environmental-sustainability', level: 1, example: 'No formal environmental awareness. Environmental sustainability is not considered in strategy or operations. No measurement of environmental impact.' },
  { domainKey: 'environmental-sustainability', level: 2, example: 'Basic awareness of environmental issues. Some ad hoc green practices (recycling, energy saving). Beginning to recognise the environmental value of productive activities.' },
  { domainKey: 'environmental-sustainability', level: 3, example: 'Environmental targets set and integrated into strategy. Green skills included in participant training. Circular economy practices documented. Basic environmental monitoring in place.' },
  { domainKey: 'environmental-sustainability', level: 4, example: 'Comprehensive environmental measurement and reporting. Accredited green skills training. Dual social-environmental impact demonstrated. Active in green networks (RREUSE) and EU just transition initiatives.' },
  { domainKey: 'environmental-sustainability', level: 5, example: 'Recognised as a model for inclusive green transition. Innovative circular economy or green skills programmes replicated by others. Contributing to EU just transition policy. Published environmental impact evidence.' },
];

// ─── Helper Functions ───

export function getQuestionHelp(questionId: string): QuestionHelp | undefined {
  return QUESTION_HELP[questionId];
}

export function getDomainMaturityExamples(domainKey: string): DomainMaturityExample[] {
  return DOMAIN_MATURITY_EXAMPLES.filter(e => e.domainKey === domainKey);
}
