import type { DriveStep } from 'driver.js';

export interface TourChapter {
  title: string;
  route: string;
  /** Optional setup to run before starting the chapter (e.g., switching tabs) */
  setup?: string;
  steps: DriveStep[];
}

export const fullAppTourChapters: TourChapter[] = [
  // ─── Chapter 1: Welcome / Home ───
  {
    title: 'Chapter 1: Welcome to WISEShift',
    route: '/',
    steps: [
      {
        popover: {
          title: 'Welcome to the Full App Tour',
          description: 'We will walk you through every part of WISEShift — from starting an assessment to analysing your results. Sit back and follow along!',
        },
      },
      {
        element: '[data-tour="home-hero"]',
        popover: {
          title: 'What Is WISEShift?',
          description: 'WISEShift helps Work Integration Social Enterprises across Europe measure their performance, benchmark against peers, and plan improvements.',
        },
      },
      {
        element: '[data-tour="home-domains"]',
        popover: {
          title: 'Assessment Domains',
          description: 'Your assessment covers domains like Governance, Human Resources, Impact Measurement, and more. Each one has a mix of scored and open-ended questions.',
        },
      },
      {
        element: '[data-tour="home-start-form"]',
        popover: {
          title: 'Start a New Assessment',
          description: 'Fill in your organisation name and optional details, then click "Start Assessment". You will get a unique access code to save your progress.',
        },
      },
      {
        element: '[data-tour="home-demo"]',
        popover: {
          title: 'Explore with Demo Data',
          description: 'Not ready to start? Try the platform using pre-loaded data from 8 example European organisations. Use code DASH-DEMO2025 on the Dashboard.',
        },
      },
      {
        element: 'nav[aria-label="Primary navigation"], nav[aria-label]',
        popover: {
          title: 'Navigation Bar',
          description: 'Use this bar to jump to the Dashboard, Methodology page, or back Home. The dark mode toggle and language switcher are also up here.',
        },
      },
    ],
  },

  // ─── Chapter 2: Self-Assessment ───
  {
    title: 'Chapter 2: Taking the Self-Assessment',
    route: '/assessment',
    steps: [
      {
        popover: {
          title: 'The Self-Assessment',
          description: 'This is where you answer 40 questions across all domains. Your responses shape your scores, action plan, and benchmarks.',
        },
      },
      {
        element: 'aside[aria-label="Assessment domains"]',
        popover: {
          title: 'Domain Sidebar',
          description: 'Use this sidebar to jump between domains. A green tick appears once you have answered all required questions in a domain.',
        },
      },
      {
        element: '[role="progressbar"]',
        popover: {
          title: 'Progress Bar',
          description: 'This shows how far through the assessment you are. You do not need to finish everything in one go — come back anytime with your access code.',
        },
      },
      {
        element: '.card',
        popover: {
          title: 'Question Types',
          description: 'You will see three kinds of questions: agree/disagree sliders, maturity level selectors, and open text boxes for your own words.',
        },
      },
      {
        popover: {
          title: 'Likert Questions',
          description: 'These are "Strongly Disagree" to "Strongly Agree" scales. Pick the point that best matches your organisation.',
        },
      },
      {
        popover: {
          title: 'Maturity Level Questions',
          description: 'Choose from five levels — Emerging, Developing, Established, Advanced, or Leading — that describe how mature your practice is.',
        },
      },
      {
        popover: {
          title: 'Narrative Questions',
          description: 'These free-text boxes are where you describe your experience in your own words. These answers feed into the qualitative research tools later.',
        },
      },
      {
        element: '[role="status"]',
        popover: {
          title: 'Auto-Save',
          description: 'Your answers save automatically every 30 seconds. You will see a small confirmation here when that happens.',
        },
      },
      {
        element: '[class*="font-mono"]',
        popover: {
          title: 'Your Access Code',
          description: 'Keep this code safe! You can use it to come back and continue from any device, any time.',
        },
      },
      {
        element: '.btn-primary',
        popover: {
          title: 'Move Between Domains',
          description: 'Click "Next" to go to the next domain. On the last domain, this button becomes "Complete Assessment".',
        },
      },
    ],
  },

  // ─── Chapter 3: Results ───
  {
    title: 'Chapter 3: Your Results',
    route: '/results',
    steps: [
      {
        popover: {
          title: 'Your Results Page',
          description: 'After completing the assessment, you land here. This page shows your overall score, domain breakdown, and qualitative evidence.',
        },
      },
      {
        element: '.rounded-xl.border',
        popover: {
          title: 'Overall Score',
          description: 'Your headline score and maturity level are shown here, along with your top strengths and areas where you can improve.',
        },
      },
      {
        element: '[role="img"]',
        popover: {
          title: 'Radar Chart',
          description: 'This spider chart gives a visual snapshot of your scores across all domains. A larger, more even shape means stronger overall performance.',
        },
      },
      {
        element: '.grid.gap-4',
        popover: {
          title: 'Domain Score Cards',
          description: 'Each card shows the score and maturity level for one domain. Look for domains with the lowest scores — those are your priority areas.',
        },
      },
      {
        element: '.space-y-3',
        popover: {
          title: 'Your Written Responses',
          description: 'All your narrative answers are grouped by domain here. Researchers can use these for qualitative analysis later.',
        },
      },
      {
        element: '.flex.flex-wrap.gap-4',
        popover: {
          title: 'What You Can Do Next',
          description: 'From here you can view your action plan, compare with benchmarks, export data, or print a report.',
        },
      },
      {
        popover: {
          title: 'Export Options',
          description: 'Download your results as a PDF report, or export data in formats ready for research tools like NVivo or Excel.',
        },
      },
      {
        popover: {
          title: 'Share Your Results',
          description: 'You can share your results URL with colleagues or funders. Anyone with the link can view (but not edit) your scores.',
        },
      },
    ],
  },

  // ─── Chapter 4: Action Plan ───
  {
    title: 'Chapter 4: Your Action Plan',
    route: '/action-plan',
    steps: [
      {
        popover: {
          title: 'Personalised Action Plan',
          description: 'Based on your scores, this page gives you concrete steps to improve — sorted by priority so you know where to start.',
        },
      },
      {
        element: '.card:has(h2)',
        popover: {
          title: 'Priority Matrix',
          description: 'Each recommendation is mapped by effort versus impact. Look for "Quick Wins" — low effort, high impact actions you can do right away.',
        },
      },
      {
        element: '.space-y-4',
        popover: {
          title: 'Track Your Progress',
          description: 'Click any recommendation to mark it as "In Progress" or "Completed". You can also add notes to record what you did.',
        },
      },
      {
        popover: {
          title: 'Focus Areas',
          description: 'Recommendations are grouped by the domains where you scored lowest. Start with the first group for maximum improvement.',
        },
      },
      {
        popover: {
          title: 'Re-Assess Later',
          description: 'After implementing some changes, take the assessment again in 6-12 months to track your improvement over time.',
        },
      },
      {
        element: '.flex.flex-wrap.gap-4',
        popover: {
          title: 'Navigate From Here',
          description: 'Go back to your results or see how you compare with other organisations in your sector.',
        },
      },
    ],
  },

  // ─── Chapter 5: Benchmarks ───
  {
    title: 'Chapter 5: Sector Benchmarks',
    route: '/benchmarks',
    steps: [
      {
        popover: {
          title: 'Benchmarking',
          description: 'See how your organisation compares against other Work Integration Social Enterprises across Europe.',
        },
      },
      {
        element: 'select#sector',
        popover: {
          title: 'Choose Your Sector',
          description: 'Pick your sector to see relevant comparisons, or choose "All WISEs" for the overall European average.',
        },
      },
      {
        element: '.card.mb-8',
        popover: {
          title: 'Your Scores vs the Average',
          description: 'Blue shows your scores, grey shows the sector average. Where blue extends beyond grey, you are ahead of your peers.',
        },
      },
      {
        element: '.card:last-of-type',
        popover: {
          title: 'Detailed Comparison Table',
          description: 'This table shows exactly where you stand relative to the 25th, 50th, and 75th percentiles in your sector.',
        },
      },
      {
        popover: {
          title: 'Use Benchmarks Wisely',
          description: 'Benchmarks are based on self-reported data. Use them as a guide for improvement, not as a strict ranking.',
        },
      },
    ],
  },

  // ─── Chapter 6: Dashboard ───
  {
    title: 'Chapter 6: The Dashboard',
    route: '/dashboard',
    steps: [
      {
        popover: {
          title: 'Sector Dashboard',
          description: 'This is the aggregate view for policymakers and researchers. It shows data across all completed assessments in one place.',
        },
      },
      {
        popover: {
          title: 'Access Code Required',
          description: 'You need a dashboard access code to enter. For the demo, use DASH-DEMO2025. Researchers receive their own codes.',
        },
      },
      {
        element: '[data-tour="dash-stats"]',
        popover: {
          title: 'Key Statistics',
          description: 'At a glance: how many assessments are completed, the average score, and how many sectors are represented.',
        },
      },
      {
        element: '.card:has(.recharts-wrapper), .card:has(canvas), .card:has([role="img"])',
        popover: {
          title: 'Sector Averages Chart',
          description: 'This radar chart shows the average score across all domains. It reveals which areas are strongest and weakest across the sector.',
        },
      },
      {
        element: '[data-tour="dash-distributions"]',
        popover: {
          title: 'Maturity & Sector Breakdown',
          description: 'See how organisations are spread across maturity levels and industry sectors. This gives context to the overall numbers.',
        },
      },
      {
        element: '.card:has(.wiseshift-word-cloud), .card:has(svg.word-cloud)',
        popover: {
          title: 'Common Themes',
          description: 'The most frequently mentioned words from narrative responses. Larger words appear more often — look for patterns.',
        },
      },
      {
        element: '[data-tour="dash-actions"]',
        popover: {
          title: 'Go Deeper',
          description: 'Compare specific assessments side-by-side, or open the Research Workspace for advanced qualitative analysis.',
        },
      },
      {
        popover: {
          title: 'EU Policy Alignment',
          description: 'The dashboard aligns with European frameworks including the Social Economy Action Plan and multiple UN Sustainable Development Goals.',
        },
      },
    ],
  },

  // ─── Chapter 7: Research Workspace ───
  {
    title: 'Chapter 7: Research Workspace',
    route: '/research',
    steps: [
      {
        popover: {
          title: 'Research Workspace',
          description: 'This is the advanced analysis hub for researchers. You will find qualitative and quantitative tools organised as tabs.',
        },
      },
      {
        element: '[data-tour="research-tabs"]',
        popover: {
          title: 'Tool Tabs',
          description: 'Each tab opens a different analysis tool — from narrative browsing to statistics, heatmaps, and data export.',
        },
      },
      {
        element: '[data-tour="research-tab-explorer"]',
        popover: {
          title: 'Narrative Explorer',
          description: 'Browse, search, and filter all written responses by domain, theme, or organisation. Click any response to read the full context.',
        },
      },
      {
        element: '[data-tour="research-tab-heatmap"]',
        popover: {
          title: 'Theme Heatmap',
          description: 'A colour-coded grid showing which themes appear in which organisations — great for spotting patterns at a glance.',
        },
      },
      {
        element: '[data-tour="research-tab-statistics"]',
        popover: {
          title: 'Statistics',
          description: 'View descriptive statistics, correlation matrices, and distribution charts across all assessment data.',
        },
      },
      {
        element: '[data-tour="research-tab-sampling"]',
        popover: {
          title: 'Sampling Assistant',
          description: 'Helps you select a representative sample of assessments for deeper qualitative analysis based on criteria you set.',
        },
      },
      {
        element: '[data-tour="research-tab-irr"]',
        popover: {
          title: 'Inter-Rater Reliability',
          description: 'If multiple researchers are coding the same data, this tool measures how consistently they agree.',
        },
      },
      {
        element: '[data-tour="research-tab-exports"]',
        popover: {
          title: 'Export Data',
          description: 'Download data in CSV, Excel, or JSON format. Qualitative exports are formatted for direct import into NVivo or ATLAS.ti.',
        },
      },
      {
        element: '[data-tour="research-tab-canvas"]',
        popover: {
          title: 'Coding Canvas Tab',
          description: 'This is the visual coding workspace we will explore in detail in the next chapter. Click it anytime to start coding interviews.',
        },
      },
    ],
  },

  // ─── Chapter 8: Coding Canvas ───
  {
    title: 'Chapter 8: The Coding Canvas',
    route: '/research',
    setup: 'canvas',
    steps: [
      {
        popover: {
          title: 'The Coding Canvas',
          description: 'This is your visual workspace for qualitative analysis — like a digital whiteboard where you code, organise, and explore interview data.',
        },
      },
      {
        element: '[data-tour="canvas-btn-transcript"]',
        popover: {
          title: 'Add Interview Text',
          description: 'Click here to paste in an interview transcript or any text you want to analyse. You can add as many transcripts as you need.',
        },
      },
      {
        element: '[data-tour="canvas-btn-question"]',
        popover: {
          title: 'Create Research Questions',
          description: 'Add questions you want to explore. They become colour-coded labels you can attach to parts of your transcripts.',
        },
      },
      {
        element: '[data-tour="canvas-btn-memo"]',
        popover: {
          title: 'Quick Notes',
          description: 'Create a memo to jot down your thoughts as you analyse — like sticky notes on your whiteboard.',
        },
      },
      {
        element: '[data-tour="canvas-flow-area"]',
        popover: {
          title: 'The Workspace',
          description: 'Drag items around, zoom in and out, and draw connections. This is where all your analysis comes together visually.',
        },
      },
      {
        element: '[data-tour="canvas-btn-autocode"]',
        popover: {
          title: 'Auto-Code',
          description: 'Scans your transcripts for keywords and patterns automatically. Review the matches and keep the ones that are relevant.',
        },
      },
      {
        element: '[data-tour="canvas-btn-cases"]',
        popover: {
          title: 'Cases',
          description: 'Group transcripts by participant, site, or category. This lets you compare patterns across different people or places.',
        },
      },
      {
        element: '[data-tour="canvas-btn-hierarchy"]',
        popover: {
          title: 'Hierarchy',
          description: 'Organise research questions under broader themes to build a structured picture of your data.',
        },
      },
      {
        element: '[data-tour="canvas-btn-stripes"]',
        popover: {
          title: 'Coding Stripes',
          description: 'Toggle colour-coded stripes alongside your transcripts to see at a glance which parts are coded and to which questions.',
        },
      },
      {
        element: '[data-tour="canvas-btn-query"]',
        popover: {
          title: 'Query & Analysis Tools',
          description: 'Add analysis cards like word clouds, statistics, framework matrices, co-occurrence charts, and clustering — all visual and interactive.',
        },
      },
      {
        popover: {
          title: 'How to Code Text',
          description: 'Select a passage in a transcript, then drag a line to a question node. The coded segment saves automatically with its position.',
        },
      },
      {
        popover: {
          title: 'Detail Panel',
          description: 'Click any question node to open a panel showing all coded segments for that question. You can annotate or remove them here.',
        },
      },
      {
        popover: {
          title: 'Create Relationships',
          description: 'Drag between cases or questions to label relationships — "supports", "contradicts", "influences" — building a conceptual map.',
        },
      },
      {
        popover: {
          title: 'Dark Mode Compatible',
          description: 'The canvas works beautifully in both light and dark mode. Use the toggle in the top navigation to switch anytime.',
        },
      },
      {
        popover: {
          title: 'Canvas Complete!',
          description: 'You now know all 14 features of the Coding Canvas. Start by adding a transcript and a question, then let the analysis unfold.',
        },
      },
    ],
  },

  // ─── Chapter 9: Extras ───
  {
    title: 'Chapter 9: Extras & Wrap-Up',
    route: '/',
    steps: [
      {
        popover: {
          title: 'A Few More Things',
          description: 'Before we finish, here are some extra features and tips you might find useful.',
        },
      },
      {
        popover: {
          title: 'Cross-Case Comparison',
          description: 'The Comparison page lets you place 2-3 assessments side by side — overlaid radar charts, score tables, and narrative comparisons.',
        },
      },
      {
        popover: {
          title: 'Methodology Page',
          description: 'Curious about the research behind WISEShift? The Methodology page explains the evidence base, maturity scale, and EU policy alignment.',
        },
      },
      {
        popover: {
          title: 'Dark Mode',
          description: 'Every page supports dark mode. Click the sun/moon icon in the navigation bar to switch. Your preference is remembered across visits.',
        },
      },
      {
        popover: {
          title: 'Tour Complete!',
          description: 'That is everything! You have seen all the major features of WISEShift. Click "Take a Tour" on any page to revisit that page\'s tour anytime.',
        },
      },
    ],
  },
];
