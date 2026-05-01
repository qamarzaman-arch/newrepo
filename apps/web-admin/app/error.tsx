'use client';

import { useEffect } from 'react';

/**
 * QA C71: global error boundary. Without this, any unhandled error in a
 * server component crashed the whole app to a Next.js default page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[admin] unhandled error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          role="alert"
          className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6"
        >
          <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-lg">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              The page hit an unexpected error. You can try again, or go back to the dashboard.
            </p>
            {error.digest && (
              <p className="mt-2 text-xs font-mono text-neutral-400">
                Reference: {error.digest}
              </p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Try again
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Dashboard
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
