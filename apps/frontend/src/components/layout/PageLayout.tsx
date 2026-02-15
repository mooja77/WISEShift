import type { ReactNode } from 'react';
import clsx from 'clsx';
import Header from './Header';
import Footer from './Footer';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <Header />

      <main
        id="main-content"
        className={clsx('flex-1 page-enter', className)}
        tabIndex={-1}
      >
        {children}
      </main>

      <Footer />
    </div>
  );
}
