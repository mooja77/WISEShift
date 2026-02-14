import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} WISEShift Self-Assessment Tool
          </p>
          <nav className="flex items-center gap-4" aria-label="Footer navigation">
            <Link
              to="/methodology"
              className="text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors"
            >
              Methodology
            </Link>
            <span className="text-gray-300" aria-hidden="true">|</span>
            <Link
              to="/methodology#privacy"
              className="text-xs font-medium text-gray-500 hover:text-brand-600 transition-colors"
            >
              Privacy Policy
            </Link>
          </nav>
          <p className="text-xs text-gray-400">
            Grounded in{' '}
            <span className="font-medium text-gray-500">EMES</span>,{' '}
            <span className="font-medium text-gray-500">ENSIE</span>, and{' '}
            <span className="font-medium text-gray-500">Horizon Europe WISESHIFT</span>{' '}
            research
          </p>
        </div>
      </div>
    </footer>
  );
}
