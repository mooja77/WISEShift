import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CURRENT_CONSENT_VERSION } from '@wiseshift/shared';

const CONSENT_KEY = 'wiseshift-consent';

interface ConsentData {
  status: 'accepted';
  timestamp: string;
  consentVersion: string;
}

function getConsent(): ConsentData | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentData;
    // Check if consent version matches current
    if (parsed.consentVersion !== CURRENT_CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setConsent(): void {
  const data: ConsentData = {
    status: 'accepted',
    timestamp: new Date().toISOString(),
    consentVersion: CURRENT_CONSENT_VERSION,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = async () => {
    // Record consent server-side
    try {
      await axios.post('/api/consent', {
        subjectType: 'organisation',
        subjectId: 'anonymous', // Updated with real ID when assessment is created
        consentVersion: CURRENT_CONSENT_VERSION,
      });
    } catch {
      // Non-blocking — still set localStorage even if server call fails
    }
    setConsent();
    setVisible(false);
  };

  const handleDecline = () => {
    setVisible(false);
    navigate('/consent-declined');
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 safe-area-bottom"
      role="dialog"
      aria-label="Cookie and data consent"
      aria-modal="true"
    >
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              This tool stores your assessment progress locally in your browser and on our
              server. We collect organisation information and assessment responses to generate
              reports. No personal identification data is required.
            </p>

            {/* Privacy & Data info toggle */}
            <button
              type="button"
              className="mt-1 text-xs font-medium text-brand-600 underline hover:text-brand-800"
              onClick={() => setShowInfo((prev) => !prev)}
            >
              Privacy &amp; Data
            </button>

            {showInfo && (
              <div className="mt-2 rounded-md bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                <p>
                  WISEShift collects only the organisation-level data you provide during
                  the assessment (sector, size, and question responses). This data is used
                  solely for generating your maturity report and contributing to anonymised
                  sector benchmarks. No personal names, emails, or identifying details are
                  required. You can read more in our{' '}
                  <Link
                    to="/privacy-policy"
                    className="font-medium text-brand-600 underline hover:text-brand-800"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={handleDecline}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Decline
            </button>
            <Link
              to="/privacy-policy"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Privacy Policy
            </Link>
            <button
              type="button"
              onClick={handleAccept}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Accept &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
