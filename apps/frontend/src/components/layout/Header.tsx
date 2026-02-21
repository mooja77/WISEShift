import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ChartBarSquareIcon,
  ClipboardDocumentCheckIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  QuestionMarkCircleIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useResearchStore } from '../../stores/researchStore';
import { useUiStore } from '../../stores/uiStore';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useTour } from '../../hooks/useTour';
import FullTourButton from './FullTourButton';
import type { DriveStep } from 'driver.js';
import {
  homeTourSteps,
  assessmentTourSteps,
  resultsTourSteps,
  actionPlanTourSteps,
  benchmarkTourSteps,
  dashboardTourSteps,
  researchTourSteps,
  comparisonTourSteps,
  methodologyTourSteps,
  canvasTourSteps,
} from '../../config/tourSteps';

const NAV_LINKS = [
  { to: '/', labelKey: 'nav.home', icon: HomeIcon },
  { to: '/methodology', labelKey: 'nav.methodology', icon: BookOpenIcon },
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: ChartBarSquareIcon },
  { to: '/registry', labelKey: 'nav.registry', icon: BuildingLibraryIcon },
] as const;

export default function Header() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { accessCode, status } = useAssessmentStore();
  const { activeTab: researchActiveTab } = useResearchStore();
  const { darkMode, toggleDarkMode } = useUiStore();

  // Determine current page tour
  const TOUR_MAP: Record<string, { steps: DriveStep[]; page: string }> = {
    '/': { steps: homeTourSteps, page: 'home' },
    '/assessment': { steps: assessmentTourSteps, page: 'assessment' },
    '/results': { steps: resultsTourSteps, page: 'results' },
    '/action-plan': { steps: actionPlanTourSteps, page: 'actionPlan' },
    '/benchmarks': { steps: benchmarkTourSteps, page: 'benchmarks' },
    '/dashboard': { steps: dashboardTourSteps, page: 'dashboard' },
    '/research': { steps: researchTourSteps, page: 'research' },
    '/comparison': { steps: comparisonTourSteps, page: 'comparison' },
    '/methodology': { steps: methodologyTourSteps, page: 'methodology' },
  };
  // Use canvas tour when on research page with canvas tab active
  const isCanvasActive = location.pathname === '/research' && researchActiveTab === 'canvas';
  const tourConfig = isCanvasActive
    ? { steps: canvasTourSteps, page: 'canvas' }
    : (TOUR_MAP[location.pathname] ?? TOUR_MAP['/']);
  const { startTour } = useTour(tourConfig.page, tourConfig.steps);

  const isAssessmentInProgress = status === 'in_progress' && accessCode;

  return (
    <>
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className={clsx(
          'sr-only focus:not-sr-only',
          'focus:absolute focus:top-2 focus:left-2 focus:z-50',
          'focus:rounded-md focus:bg-brand-600 focus:px-4 focus:py-2',
          'focus:text-white focus:text-sm focus:font-medium',
          'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-600',
        )}
      >
        {t('app.skipToContent')}
      </a>

      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-gray-700 dark:bg-gray-900/95 dark:supports-[backdrop-filter]:bg-gray-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 rounded-md"
              aria-label="WISEShift home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                WISE<span className="text-brand-600 dark:text-brand-400">Shift</span>
              </span>
            </Link>
          </div>

          {/* Center: Access code badge (when assessment in progress) */}
          {isAssessmentInProgress && (
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              <span className="sr-only">{t('nav.accessCode')}</span>
              <span className="font-mono tracking-wider">{accessCode}</span>
            </div>
          )}

          {/* Desktop navigation */}
          <nav className="hidden sm:flex items-center gap-1" aria-label={t('nav.primaryNav')}>
            {NAV_LINKS.map(({ to, labelKey, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {t(labelKey)}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={startTour}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              aria-label={t('tour.takeATour')}
            >
              <QuestionMarkCircleIcon className="h-4 w-4" aria-hidden="true" />
              {t('tour.takeATour')}
            </button>
            <FullTourButton />
            <LanguageSwitcher />
            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <SunIcon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <MoonIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </nav>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className={clsx(
              'sm:hidden inline-flex items-center justify-center rounded-md p-2',
              'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
            )}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile menu panel */}
        <div
          id="mobile-menu"
          className={clsx(
            'sm:hidden overflow-hidden transition-all duration-200 ease-in-out',
            mobileMenuOpen ? 'max-h-96 border-t border-gray-200 dark:border-gray-700' : 'max-h-0',
          )}
          role="navigation"
          aria-label={t('nav.mobileNav')}
        >
          <div className="space-y-1 px-4 pb-4 pt-2">
            {/* Access code in mobile menu */}
            {isAssessmentInProgress && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                </span>
                <span>
                  {t('nav.accessCode')} <span className="font-mono tracking-wider">{accessCode}</span>
                </span>
              </div>
            )}

            {NAV_LINKS.map(({ to, labelKey, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={clsx(
                    'flex items-center gap-3 rounded-md px-3 py-2 min-h-[44px] text-base font-medium transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {t(labelKey)}
                </Link>
              );
            })}

            {/* Mobile-only controls */}
            <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 min-h-[44px] text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <SunIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <MoonIcon className="h-5 w-5" aria-hidden="true" />
                )}
                {darkMode ? t('nav.lightMode', 'Light Mode') : t('nav.darkMode', 'Dark Mode')}
              </button>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
