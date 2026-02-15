import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-brand-600 dark:text-brand-400">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Page not found</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-block">
          Return Home
        </Link>
      </div>
    </div>
  );
}
