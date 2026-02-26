const CONSENT_VERSION = '1.0';

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Version {CONSENT_VERSION} — Last updated February 2026
      </p>

      <div className="mt-8 space-y-8 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            1. What We Collect
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Organisation information</strong>: name, country, region,
              sector, size, legal structure. Provided during assessment
              registration.
            </li>
            <li>
              <strong>Assessment responses</strong>: Likert-scale ratings,
              maturity self-assessments, and narrative text responses across 8
              domains.
            </li>
            <li>
              <strong>Qualitative research data</strong>: Highlights, tags,
              notes, and coding layer annotations created by researchers
              during qualitative analysis.
            </li>
            <li>
              <strong>Consent records</strong>: A server-side record of when you
              granted or withdrew consent, including a hashed (non-reversible)
              version of your IP address.
            </li>
            <li>
              <strong>Audit logs</strong>: Data access events (who accessed what
              data, when, and what action was taken). IP addresses are hashed
              before storage.
            </li>
          </ul>
          <p className="mt-3 text-sm">
            We do <strong>not</strong> collect personal names, email addresses,
            or other directly identifying information from organisations
            completing assessments. Researcher accounts require an email address
            for verification only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            2. Why We Collect It
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>
              To generate your organisation's maturity assessment report and
              action plan.
            </li>
            <li>
              To provide anonymised sector benchmarks (with k=5 anonymity
              threshold).
            </li>
            <li>
              To enable qualitative research and cross-case comparison for
              researchers with approved access.
            </li>
            <li>
              To maintain an auditable record of data access for ethics
              committee compliance.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            3. How Long We Keep It
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Completed assessments</strong>: retained for 24 months
              after completion, then automatically deleted.
            </li>
            <li>
              <strong>In-progress assessments</strong>: retained for 6 months
              after last update, then automatically deleted.
            </li>
            <li>
              <strong>Audit logs</strong>: retained for the duration of the
              research project (up to 5 years) as required by ethics committees.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            4. Your Rights
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Right to erasure</strong>: You can request deletion of all
              your organisation's data via the{' '}
              <a
                href="/data-management"
                className="font-medium text-brand-600 underline hover:text-brand-800"
              >
                Data Management
              </a>{' '}
              page using your access code.
            </li>
            <li>
              <strong>Right to anonymisation</strong>: You can anonymise your
              assessment data (removing organisation name and narrative text)
              while retaining anonymised scores for benchmarking.
            </li>
            <li>
              <strong>Right to withdraw consent</strong>: You can withdraw
              consent at any time. This will prevent further processing of your
              data.
            </li>
            <li>
              <strong>Right to access</strong>: You can view all data associated
              with your access code by resuming your assessment.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            5. Data Security
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            <li>
              Access codes are hashed using bcrypt — we never store your
              plaintext access code.
            </li>
            <li>
              All data is transmitted over HTTPS with HSTS enforcement.
            </li>
            <li>
              IP addresses are hashed with SHA-256 before being stored in audit
              logs.
            </li>
            <li>
              The application uses Content Security Policy headers to prevent
              XSS and data exfiltration.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            6. Contact
          </h2>
          <p className="mt-3 text-sm">
            For questions about this privacy policy or to exercise your data
            rights, contact the WISEShift project team at your institution's
            research ethics office or via the project coordinator.
          </p>
        </section>
      </div>
    </div>
  );
}
