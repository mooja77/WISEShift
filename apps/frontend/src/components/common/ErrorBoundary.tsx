import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-950">
            <h2 className="text-xl font-bold text-red-800 dark:text-red-200">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <pre className="mt-3 max-w-md overflow-auto rounded bg-red-100 p-2 text-left text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>
              <a
                href="/"
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
