import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-gray-500">
            {t('app.copyright', { year: currentYear })}
          </p>
          <nav className="flex items-center gap-4" aria-label="Footer navigation">
            <Link
              to="/methodology"
              className="text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors"
            >
              {t('nav.methodology')}
            </Link>
            <span className="text-gray-300" aria-hidden="true">|</span>
            <Link
              to="/methodology#privacy"
              className="text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-gray-300" aria-hidden="true">|</span>
            <Link
              to="/data-management"
              className="text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors"
            >
              Manage My Data
            </Link>
          </nav>
          <p className="text-xs text-gray-400">
            {t('app.footerAttribution')}
          </p>
        </div>
      </div>
    </footer>
  );
}
