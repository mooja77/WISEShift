import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import PageLayout from './components/layout/PageLayout';
import HomePage from './pages/HomePage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
import AssessmentPage from './pages/AssessmentPage';
import ResultsPage from './pages/ResultsPage';
import ActionPlanPage from './pages/ActionPlanPage';
import BenchmarkPage from './pages/BenchmarkPage';
import ResumePage from './pages/ResumePage';
import DashboardPage from './pages/DashboardPage';
import PrintReportPage from './pages/PrintReportPage';
import ComparisonPage from './pages/ComparisonPage';
import MethodologyPage from './pages/MethodologyPage';
import ResearchPage from './pages/ResearchPage';
import DataManagementPage from './pages/DataManagementPage';
import PolicyAlignmentPage from './pages/PolicyAlignmentPage';
import ApiDocsPage from './pages/ApiDocsPage';
import ProgressPage from './pages/ProgressPage';
import RegistryPage from './pages/RegistryPage';
import RegistryProfilePage from './pages/RegistryProfilePage';
import ResearcherPortalPage from './pages/ResearcherPortalPage';
import WorkingGroupPage from './pages/WorkingGroupPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Assessment page has its own layout with sidebar */}
        <Route path="/assessment" element={<AssessmentPage />} />

      {/* All other pages use the standard layout */}
      <Route
        path="/"
        element={
          <PageLayout>
            <HomePage />
          </PageLayout>
        }
      />
      <Route
        path="/results"
        element={
          <PageLayout>
            <ResultsPage />
          </PageLayout>
        }
      />
      <Route
        path="/action-plan"
        element={
          <PageLayout>
            <ActionPlanPage />
          </PageLayout>
        }
      />
      <Route
        path="/benchmarks"
        element={
          <PageLayout>
            <BenchmarkPage />
          </PageLayout>
        }
      />
      <Route
        path="/resume"
        element={
          <PageLayout>
            <ResumePage />
          </PageLayout>
        }
      />
      <Route
        path="/methodology"
        element={
          <PageLayout>
            <MethodologyPage />
          </PageLayout>
        }
      />
      <Route
        path="/report"
        element={
          <PageLayout>
            <PrintReportPage />
          </PageLayout>
        }
      />
      <Route
        path="/comparison"
        element={
          <PageLayout>
            <ComparisonPage />
          </PageLayout>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PageLayout>
            <DashboardPage />
          </PageLayout>
        }
      />
      <Route
        path="/research"
        element={
          <PageLayout>
            <ResearchPage />
          </PageLayout>
        }
      />
      <Route
        path="/policy-alignment"
        element={
          <PageLayout>
            <PolicyAlignmentPage />
          </PageLayout>
        }
      />
      <Route
        path="/api-docs"
        element={
          <PageLayout>
            <ApiDocsPage />
          </PageLayout>
        }
      />
      <Route
        path="/progress"
        element={
          <PageLayout>
            <ProgressPage />
          </PageLayout>
        }
      />
      <Route
        path="/registry"
        element={
          <PageLayout>
            <RegistryPage />
          </PageLayout>
        }
      />
      <Route
        path="/registry/:slug"
        element={
          <PageLayout>
            <RegistryProfilePage />
          </PageLayout>
        }
      />
      <Route
        path="/researcher-portal"
        element={
          <PageLayout>
            <ResearcherPortalPage />
          </PageLayout>
        }
      />
      <Route
        path="/working-groups"
        element={
          <PageLayout>
            <WorkingGroupPage />
          </PageLayout>
        }
      />
      <Route
        path="/data-management"
        element={
          <PageLayout>
            <DataManagementPage />
          </PageLayout>
        }
      />
      <Route
        path="*"
        element={
          <PageLayout>
            <NotFoundPage />
          </PageLayout>
        }
      />
      </Routes>
    </>
  );
}
