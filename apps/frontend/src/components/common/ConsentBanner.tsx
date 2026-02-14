import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'wiseshift-consent';

interface ConsentData {
  status: 'accepted';
  timestamp: string;
}

function getConsent(): ConsentData | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentData;
  } catch {
    return null;
  }
}

function setConsent(): void {
  const data: ConsentData = {
    status: 'accepted',
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    setConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg"
      role="dialog"
      aria-label="Cookie and data consent"
    >
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-700">
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
              <div className="mt-2 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
                <p>
                  WISEShift collects only the organisation-level data you provide during
                  the assessment (sector, size, and question responses). This data is used
                  solely for generating your maturity report and contributing to anonymised
                  sector benchmarks. No personal names, emails, or identifying details are
                  required. You can read more on our{' '}
                  <Link
                    to="/methodology#privacy"
                    className="font-medium text-brand-600 underline hover:text-brand-800"
                  >
                    methodology page
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              to="/methodology#privacy"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Learn More
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
