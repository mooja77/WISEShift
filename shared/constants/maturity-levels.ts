export interface MaturityLevel {
  level: number;
  name: string;
  shortDescription: string;
  description: string;
  color: string;
}

export const MATURITY_LEVELS: MaturityLevel[] = [
  {
    level: 1,
    name: 'Emerging',
    shortDescription: 'Beginning to develop',
    description: 'The organisation is in the early stages of development in this area. Practices are ad hoc or informal, with limited documentation or consistency. There is awareness of the need but limited systematic action.',
    color: '#EF4444', // red-500
  },
  {
    level: 2,
    name: 'Developing',
    shortDescription: 'Building foundations',
    description: 'The organisation has begun to establish basic practices and structures. Some documentation exists, and there is growing consistency. Key foundations are in place but not yet fully embedded.',
    color: '#F97316', // orange-500
  },
  {
    level: 3,
    name: 'Established',
    shortDescription: 'Consistently practiced',
    description: 'The organisation has well-defined, documented practices that are consistently applied. There are clear processes, regular review, and good stakeholder awareness. This represents solid, reliable performance.',
    color: '#CA8A04', // yellow-600 (improved contrast for WCAG AA)
  },
  {
    level: 4,
    name: 'Advanced',
    shortDescription: 'Excelling and innovating',
    description: 'The organisation demonstrates excellence with integrated, data-informed practices. There is evidence of continuous improvement, innovation, and strong stakeholder engagement. Performance exceeds sector norms.',
    color: '#16A34A', // green-600 (improved contrast for WCAG AA)
  },
  {
    level: 5,
    name: 'Leading',
    shortDescription: 'Sector-leading practice',
    description: 'The organisation is a recognised leader in this area, demonstrating best practice that others aspire to. There is strong evidence of sustained excellence, thought leadership, and systemic influence.',
    color: '#3B82F6', // blue-500
  },
];

export function getMaturityLevel(score: number): MaturityLevel {
  if (score < 1.5) return MATURITY_LEVELS[0];
  if (score < 2.5) return MATURITY_LEVELS[1];
  if (score < 3.5) return MATURITY_LEVELS[2];
  if (score < 4.5) return MATURITY_LEVELS[3];
  return MATURITY_LEVELS[4];
}

export function getMaturityLevelByName(name: string): MaturityLevel | undefined {
  return MATURITY_LEVELS.find(l => l.name.toLowerCase() === name.toLowerCase());
}
