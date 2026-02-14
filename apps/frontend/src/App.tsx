import { Routes, Route } from 'react-router-dom';
import PageLayout from './components/layout/PageLayout';
import HomePage from './pages/HomePage';
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
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
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
        path="*"
        element={
          <PageLayout>
            <NotFoundPage />
          </PageLayout>
        }
      />
    </Routes>
  );
}
