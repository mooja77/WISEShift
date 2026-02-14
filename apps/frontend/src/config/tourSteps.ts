import type { DriveStep } from 'driver.js';

export const homeTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Welcome to WISEShift',
      description: 'This self-assessment tool helps Work Integration Social Enterprises evaluate their performance across 8 key domains. Let us show you around!',
    },
  },
  {
    element: '.grid.grid-cols-2',
    popover: {
      title: 'Assessment Domains',
      description: 'Your assessment covers 8 domains: from Governance to Impact Measurement. Each domain has a mix of quantitative and qualitative questions.',
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
      description: 'This spider chart visualises your scores across all 8 domains. A larger, more even shape indicates stronger overall performance.',
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
