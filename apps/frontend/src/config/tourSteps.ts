import type { DriveStep } from 'driver.js';

export const homeTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to WISEShift',
      description: 'This self-assessment tool helps Work Integration Social Enterprises evaluate their performance across 9 key domains. Let us show you around!',
    },
  },
  {
    element: '.grid.grid-cols-2',
    popover: {
      title: 'Assessment Domains',
      description: 'Your assessment covers 9 domains: from Governance to Impact Measurement. Each domain has a mix of quantitative and qualitative questions.',
    },
  },
  {
    element: 'form',
    popover: {
      title: 'Start Your Assessment',
      description: 'Fill in your organisation details here to begin. Only the organisation name is required — other fields help with benchmarking.',
    },
  },
  {
    element: '[class*="border-brand-200"]',
    popover: {
      title: 'Resume Your Work',
      description: 'If you have an assessment in progress, it will appear here with your access code. You can return anytime!',
    },
  },
  {
    element: 'nav[aria-label="Primary navigation"]',
    popover: {
      title: 'Navigation',
      description: 'Use the top menu to access the Dashboard (for researchers/policymakers) and Methodology page.',
    },
  },
  {
    popover: {
      title: 'Want to Explore First?',
      description: 'You can try the full app with demo data before starting your own assessment. 8 example European WISEs (demo data) are pre-loaded with complete assessment data.',
    },
  },
  {
    element: 'a[href="/dashboard"]',
    popover: {
      title: 'Try the Dashboard Demo',
      description: 'Visit the Dashboard and enter code <strong>DASH-DEMO2025</strong> to see aggregate data from 8 demo organisations across Europe. This is a great way to understand what the tool can do.',
    },
  },
];

export const assessmentTourSteps: DriveStep[] = [
  {
    element: 'aside[aria-label="Assessment domains"]',
    popover: {
      title: 'Domain Navigation',
      description: 'Navigate between assessment domains using this sidebar. A green checkmark appears when all required questions in a domain are answered.',
    },
  },
  {
    element: '[role="progressbar"]',
    popover: {
      title: 'Your Progress',
      description: 'This bar shows your overall progress across all domains. You don\'t need to complete everything in one sitting!',
    },
  },
  {
    element: '.card',
    popover: {
      title: 'Assessment Questions',
      description: 'Each question has a type: Likert scales (agree/disagree), maturity level selectors, or narrative text boxes. Narrative responses are especially valuable for qualitative research.',
    },
  },
  {
    element: '[role="status"]',
    popover: {
      title: 'Auto-Save',
      description: 'Your answers are saved automatically every 30 seconds. You\'ll see a confirmation here when saving completes.',
    },
  },
  {
    element: '[class*="font-mono"]',
    popover: {
      title: 'Your Access Code',
      description: 'Keep this code safe! You can use it to return and continue your assessment later from any browser.',
    },
  },
  {
    element: '.btn-primary',
    popover: {
      title: 'Navigation Buttons',
      description: 'Use these buttons to move between domains. On the last domain, this becomes "Complete Assessment".',
    },
  },
];

export const resultsTourSteps: DriveStep[] = [
  {
    element: '.rounded-xl.border',
    popover: {
      title: 'Score Overview',
      description: 'Your overall score and maturity level are shown here, along with your top strengths and areas for development.',
    },
  },
  {
    element: '[role="img"]',
    popover: {
      title: 'Radar Chart',
      description: 'This spider chart visualises your scores across all 9 domains. A larger, more even shape indicates stronger overall performance.',
    },
  },
  {
    element: '.grid.gap-4',
    popover: {
      title: 'Domain Score Cards',
      description: 'Each card shows the score and maturity level for one domain. Click through to see detailed breakdowns.',
    },
  },
  {
    element: '.space-y-3',
    popover: {
      title: 'Qualitative Evidence',
      description: 'Your narrative responses are grouped by domain here. These are especially valuable for researchers conducting qualitative analysis.',
    },
  },
  {
    element: '.flex.flex-wrap.gap-4',
    popover: {
      title: 'Actions & Exports',
      description: 'From here you can view your action plan, compare with benchmarks, export data for research tools like NVivo, or print a report.',
    },
  },
];

export const actionPlanTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Your Personalised Action Plan',
      description: 'Based on your assessment scores, this page provides concrete recommendations to help your organisation improve, sorted by priority level.',
    },
  },
  {
    element: '.card:has(h2)',
    popover: {
      title: 'Priority Matrix',
      description: 'Each recommendation is mapped by effort vs impact. Look for \'Quick Wins\' (low effort, high impact) to get started.',
    },
  },
  {
    element: '.space-y-4',
    popover: {
      title: 'Track Your Progress',
      description: 'Click any recommendation to mark it as \'In Progress\' or \'Completed\'. Add notes to record what you\'ve done.',
    },
  },
  {
    element: '.flex.flex-wrap.gap-4',
    popover: {
      title: 'Navigate',
      description: 'Go back to your results or see how you compare with other organisations in your sector.',
    },
  },
];

export const benchmarkTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Sector Benchmarking',
      description: 'See how your organisation compares against other Work Integration Social Enterprises across Europe.',
    },
  },
  {
    element: 'select#sector',
    popover: {
      title: 'Choose Your Sector',
      description: 'Select your sector to see relevant comparisons. \'All WISEs\' shows the overall European average.',
    },
  },
  {
    element: '.card.mb-8',
    popover: {
      title: 'Your Scores vs Sector Average',
      description: 'Blue shows your scores, gray shows the sector average. Areas where blue extends beyond gray are your strengths.',
    },
  },
  {
    element: '.card:last-of-type',
    popover: {
      title: 'Domain-by-Domain Comparison',
      description: 'This table shows exactly where you stand relative to the 25th, 50th, and 75th percentiles in your sector.',
    },
  },
];

export const dashboardTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'European WISE Sector Dashboard',
      description: 'This dashboard shows aggregate data across all completed assessments, giving policymakers and researchers an overview of the WISE sector.',
    },
  },
  {
    element: '.grid.grid-cols-2.sm\\:grid-cols-4',
    popover: {
      title: 'Key Statistics',
      description: 'At a glance: how many assessments have been completed, the average score, and how many different sectors are represented.',
    },
  },
  {
    element: '.card:has(.recharts-wrapper), .card:has(canvas)',
    popover: {
      title: 'Sector Averages',
      description: 'This radar chart shows the average score across all 9 assessment domains. It reveals which areas are strongest and weakest across the sector.',
    },
  },
  {
    element: '.grid.lg\\:grid-cols-2',
    popover: {
      title: 'Distribution Breakdown',
      description: 'See how organisations are distributed across maturity levels and NACE-aligned industry sectors.',
    },
  },
  {
    element: '.card:has(.wiseshift-word-cloud), .card:has(svg.word-cloud)',
    popover: {
      title: 'Common Themes',
      description: 'The most frequently mentioned words from narrative responses across all organisations. Larger words appear more often.',
    },
  },
  {
    element: '.flex.flex-wrap.gap-3',
    popover: {
      title: 'Go Deeper',
      description: 'Compare specific assessments side-by-side, or open the Research Workspace for qualitative analysis tools.',
    },
  },
];

export const researchTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Research Workspace',
      description: 'Advanced qualitative and quantitative analysis tools for researchers studying the WISE sector.',
    },
  },
  {
    element: '[role="tablist"], .flex.flex-wrap.gap-2',
    popover: {
      title: 'Research Tools',
      description: 'Switch between tools: explore narrative responses, view theme heatmaps, run statistical analyses, and export data for tools like NVivo.',
    },
  },
  {
    element: '.mt-6 > div:first-child',
    popover: {
      title: 'Active Tool',
      description: 'Browse, search, and filter qualitative responses by domain, theme, or organisation. Click any response to see the full context.',
    },
  },
  {
    popover: {
      title: 'Statistical Dashboard',
      description: 'Use the Statistics tab to view descriptive statistics, correlation matrices, and distribution charts across all assessment data.',
    },
  },
  {
    popover: {
      title: 'Export for Research',
      description: 'Use the Exports tab to download data in CSV, Excel, or JSON format. Qualitative exports are formatted for direct import into NVivo or ATLAS.ti.',
    },
  },
];

export const comparisonTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Cross-Case Comparison',
      description: 'Compare 2\u20133 completed assessments side by side to identify patterns, differences, and shared strengths.',
    },
  },
  {
    element: '.card',
    popover: {
      title: 'Enter Assessment IDs',
      description: 'Enter the IDs of completed assessments you want to compare. You can find these in the results URL or in the dashboard\'s recent assessments table.',
    },
  },
  {
    popover: {
      title: 'Comparison Results',
      description: 'You\'ll see an overlaid radar chart, a score comparison table, and a qualitative comparison of narrative responses.',
    },
  },
];

export const methodologyTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Methodology & Research Foundations',
      description: 'Understand the evidence base behind WISEShift: which European research projects and policy frameworks inform the assessment.',
    },
  },
  {
    element: 'table',
    popover: {
      title: 'Assessment Framework',
      description: 'Each of the 9 domains maps to established indicators from the EMES Research Network and the ENSIE Impact-WISEs data collection.',
    },
  },
  {
    element: '.space-y-3',
    popover: {
      title: '5-Level Maturity Scale',
      description: 'From \'Emerging\' (just getting started) to \'Leading\' (a sector exemplar). Every domain score maps to one of these levels.',
    },
  },
  {
    element: '.grid.sm\\:grid-cols-2:last-of-type',
    popover: {
      title: 'EU Policy Alignment',
      description: 'The assessment supports alignment with the EU Social Economy Action Plan, the European Pillar of Social Rights, and the UN Sustainable Development Goals.',
    },
  },
];
