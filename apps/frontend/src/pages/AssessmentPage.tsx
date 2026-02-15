import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { DOMAINS } from '@wiseshift/shared';
import type { ResponseInput } from '@wiseshift/shared';
import { UserPlusIcon, Bars3Icon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useUiStore } from '../stores/uiStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { useTour } from '../hooks/useTour';
import { assessmentTourSteps } from '../config/tourSteps';
import { assessmentApi } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import DomainStep from '../components/assessment/DomainStep';
import AutoSaveIndicator from '../components/assessment/AutoSaveIndicator';
import CollaboratorPanel from '../components/assessment/CollaboratorPanel';
import { ProgressBar } from '../components/common/ProgressBar';
import toast from 'react-hot-toast';

export default function AssessmentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [collabOpen, setCollabOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    assessmentId,
    accessCode,
    status,
    currentDomainIndex,
    responses,
    setResponse,
    setCurrentDomain,
    completeAssessment,
  } = useAssessmentStore();
  const { toggleMobileSidebar } = useUiStore();
  const { saveResponses } = useAutoSave();
  const { hasSeenTour, startTour } = useTour('assessment', assessmentTourSteps);

  useEffect(() => {
    if (!assessmentId || status === 'idle') {
      navigate('/');
    }
  }, [assessmentId, status, navigate]);

  useEffect(() => {
    if (assessmentId && !hasSeenTour) {
      const timeout = setTimeout(startTour, 500);
      return () => clearTimeout(timeout);
    }
  }, [assessmentId, hasSeenTour, startTour]);

  const currentDomain = DOMAINS[currentDomainIndex];

  // Calculate progress
  const totalRequired = DOMAINS.reduce(
    (sum, d) => sum + d.questions.filter((q) => q.required).length,
    0
  );
  const answeredRequired = DOMAINS.reduce((sum, d) => {
    return (
      sum +
      d.questions.filter((q) => {
        if (!q.required) return false;
        const resp = responses[q.id];
        if (!resp) return false;
        if (q.type === 'narrative') return !!resp.textValue?.trim();
        return resp.numericValue != null;
      }).length
    );
  }, 0);
  const progressPercent = totalRequired > 0 ? Math.round((answeredRequired / totalRequired) * 100) : 0;

  // Domain progress for sidebar
  const domainProgress: Record<string, number> = {};
  for (const domain of DOMAINS) {
    const required = domain.questions.filter((q) => q.required).length;
    const answered = domain.questions.filter((q) => {
      if (!q.required) return false;
      const resp = responses[q.id];
      if (!resp) return false;
      if (q.type === 'narrative') return !!resp.textValue?.trim();
      return resp.numericValue != null;
    }).length;
    domainProgress[domain.key] = required > 0 ? Math.round((answered / required) * 100) : 0;
  }

  const handleResponseChange = useCallback(
    (questionId: string, response: ResponseInput) => {
      setResponse(questionId, response);
    },
    [setResponse]
  );

  const handleNext = async () => {
    await saveResponses();
    if (currentDomainIndex < DOMAINS.length - 1) {
      setCurrentDomain(currentDomainIndex + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentDomainIndex > 0) {
      setCurrentDomain(currentDomainIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleComplete = async () => {
    await saveResponses();
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      await assessmentApi.complete(assessmentId!);
      completeAssessment();
      setConfirmOpen(false);
      toast.success(t('assessment.completedSuccess'));
      navigate(`/results?id=${assessmentId}`);
    } catch (err) {
      toast.error(t('assessment.failedSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  // Find incomplete domains for the confirmation modal
  const incompleteDomains = DOMAINS.filter((domain) => {
    const required = domain.questions.filter((q) => q.required);
    return required.some((q) => {
      const resp = responses[q.id];
      if (!resp) return true;
      if (q.type === 'narrative') return !resp.textValue?.trim();
      return resp.numericValue == null;
    });
  });

  if (!currentDomain) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar
        currentDomainIndex={currentDomainIndex}
        onSelectDomain={(index) => {
          saveResponses();
          setCurrentDomain(index);
          window.scrollTo(0, 0);
        }}
        domainProgress={domainProgress}
      />

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 sm:px-6 dark:border-gray-700 dark:bg-gray-900/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger toggle */}
              <button
                type="button"
                onClick={toggleMobileSidebar}
                className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                aria-label="Open domain navigation"
              >
                <Bars3Icon className="h-5 w-5" aria-hidden="true" />
              </button>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('assessment.domainOf', { current: currentDomainIndex + 1, total: DOMAINS.length })}
                </p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{currentDomain.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AutoSaveIndicator />
              <button
                type="button"
                onClick={() => setCollabOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-200 hover:bg-purple-100"
              >
                <UserPlusIcon className="h-3.5 w-3.5" />
                {t('collaboration.invite')}
              </button>
              {accessCode && (
                <span className="hidden sm:inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-mono font-medium text-gray-700">
                  {accessCode}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2">
            <ProgressBar value={progressPercent} label={t('assessment.overallProgress')} showPercentage />
            {(() => {
              const unanswered = totalRequired - answeredRequired;
              if (unanswered > 0) {
                const minutesRemaining = unanswered * 2;
                return (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    ~{minutesRemaining} {minutesRemaining === 1 ? 'minute' : 'minutes'} remaining
                  </p>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Save confidence banner */}
        {accessCode && (
          <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="flex-1">
                {t('saveConfidence.bannerText')}{' '}
                <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono font-bold">{accessCode}</code>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(accessCode);
                  toast.success(t('saveConfidence.codeCopied'));
                }}
                className="shrink-0 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {t('saveConfidence.copyCode')}
              </button>
            </div>
          </div>
        )}

        {/* Domain Content */}
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <DomainStep
            domain={currentDomain}
            responses={responses}
            onResponseChange={handleResponseChange}
          />

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
            <button
              onClick={handlePrevious}
              disabled={currentDomainIndex === 0}
              className="btn-secondary"
            >
              {t('assessment.previous')}
            </button>

            <div className="flex gap-3">
              {currentDomainIndex === DOMAINS.length - 1 ? (
                <button onClick={handleComplete} className="btn-primary">
                  {t('assessment.completeAssessment')}
                </button>
              ) : (
                <button onClick={handleNext} className="btn-primary">
                  {t('assessment.nextDomain')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collaborator Panel */}
      {assessmentId && (
        <CollaboratorPanel
          open={collabOpen}
          onClose={() => setCollabOpen(false)}
          assessmentId={assessmentId}
        />
      )}

      {/* Submit Confirmation Modal */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="flex flex-col items-center text-center">
              {progressPercent >= 100 ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircleIcon className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <ExclamationTriangleIcon className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
              )}

              <DialogTitle className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
                Submit Your Assessment?
              </DialogTitle>

              <div className="mt-3 text-3xl font-extrabold text-brand-600 dark:text-brand-400">
                {progressPercent}%
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">completed</p>
            </div>

            {progressPercent < 100 && incompleteDomains.length > 0 ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  These domains have unanswered questions:
                </p>
                <ul className="mt-2 space-y-1">
                  {incompleteDomains.map((d) => (
                    <li key={d.key} className="text-sm text-amber-700 dark:text-amber-300">
                      &bull; {d.name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  All required questions have been answered. Your assessment is ready to submit.
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="btn-primary flex-1"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
