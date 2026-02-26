import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import PageLayout from './components/layout/PageLayout';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import HomePage from './pages/HomePage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Eagerly loaded (common entry points)
import AssessmentPage from './pages/AssessmentPage';
import ResumePage from './pages/ResumePage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy-loaded pages (visited after assessment flow)
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const ActionPlanPage = lazy(() => import('./pages/ActionPlanPage'));
const BenchmarkPage = lazy(() => import('./pages/BenchmarkPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PrintReportPage = lazy(() => import('./pages/PrintReportPage'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'));
const ResearchPage = lazy(() => import('./pages/ResearchPage'));
const DataManagementPage = lazy(() => import('./pages/DataManagementPage'));
const PolicyAlignmentPage = lazy(() => import('./pages/PolicyAlignmentPage'));
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const RegistryPage = lazy(() => import('./pages/RegistryPage'));
const RegistryProfilePage = lazy(() => import('./pages/RegistryProfilePage'));
const ResearcherPortalPage = lazy(() => import('./pages/ResearcherPortalPage'));
const WorkingGroupPage = lazy(() => import('./pages/WorkingGroupPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Assessment page has its own layout with sidebar */}
          <Route path="/assessment" element={<AssessmentPage />} />

          {/* All other pages use the standard layout */}
          <Route path="/" element={<PageLayout><HomePage /></PageLayout>} />
          <Route path="/results" element={<PageLayout><ResultsPage /></PageLayout>} />
          <Route path="/action-plan" element={<PageLayout><ActionPlanPage /></PageLayout>} />
          <Route path="/benchmarks" element={<PageLayout><BenchmarkPage /></PageLayout>} />
          <Route path="/resume" element={<PageLayout><ResumePage /></PageLayout>} />
          <Route path="/methodology" element={<PageLayout><MethodologyPage /></PageLayout>} />
          <Route path="/report" element={<PageLayout><PrintReportPage /></PageLayout>} />
          <Route path="/comparison" element={<PageLayout><ComparisonPage /></PageLayout>} />
          <Route path="/dashboard" element={<PageLayout><DashboardPage /></PageLayout>} />
          <Route path="/research" element={<PageLayout><ResearchPage /></PageLayout>} />
          <Route path="/policy-alignment" element={<PageLayout><PolicyAlignmentPage /></PageLayout>} />
          <Route path="/api-docs" element={<PageLayout><ApiDocsPage /></PageLayout>} />
          <Route path="/progress" element={<PageLayout><ProgressPage /></PageLayout>} />
          <Route path="/registry" element={<PageLayout><RegistryPage /></PageLayout>} />
          <Route path="/registry/:slug" element={<PageLayout><RegistryProfilePage /></PageLayout>} />
          <Route path="/researcher-portal" element={<PageLayout><ResearcherPortalPage /></PageLayout>} />
          <Route path="/working-groups" element={<PageLayout><WorkingGroupPage /></PageLayout>} />
          <Route path="/data-management" element={<PageLayout><DataManagementPage /></PageLayout>} />
          <Route path="/privacy-policy" element={<PageLayout><PrivacyPolicyPage /></PageLayout>} />
          <Route
            path="/consent-declined"
            element={
              <PageLayout>
                <div className="mx-auto max-w-2xl px-4 py-16 text-center">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consent Required</h1>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">
                    WISEShift requires your consent to collect and process assessment data. Without consent,
                    we cannot store your responses or generate reports.
                  </p>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    If you change your mind, simply return to the home page and accept the consent banner.
                  </p>
                  <a href="/" className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                    Return Home
                  </a>
                </div>
              </PageLayout>
            }
          />
          <Route path="*" element={<PageLayout><NotFoundPage /></PageLayout>} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
