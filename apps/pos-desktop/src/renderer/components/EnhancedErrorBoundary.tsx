import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('Error caught by boundary:', error, errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error reporting service (e.g., Sentry, LogRocket)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In production, send to error tracking service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('pos_error_log') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.shift();
      }
      
      localStorage.setItem('pos_error_log', JSON.stringify(existingErrors));
    } catch (e) {
      console.error('Failed to log error:', e);
    }

    // QA B43: forward to backend error endpoint when configured. Wrapped in
    // try/catch so the boundary itself never throws while reporting an error.
    try {
      const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
      const reportUrl = `${apiBase.replace(/\/$/, '')}/api/v1/audit-logs/client-error`;
      // Fire-and-forget; we already logged locally.
      void fetch(reportUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(errorReport),
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      /* never let the boundary itself throw */
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const { error, errorInfo } = this.state;
    
    const bugReport = `
Error: ${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}

Browser: ${navigator.userAgent}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(bugReport).then(() => {
      alert('Error details copied to clipboard. Please send this to support.');
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600">
                We're sorry for the inconvenience. The application encountered an unexpected error.
              </p>
            </div>

            {/* Error Details (Collapsible) */}
            <details className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                Technical Details
              </summary>
              <div className="mt-4 space-y-2">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Error Message:</p>
                  <p className="text-sm text-red-600 font-mono">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                </div>
                
                {this.state.error?.stack && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Stack Trace:</p>
                    <pre className="text-xs text-gray-700 font-mono overflow-x-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}

                {this.state.errorInfo?.componentStack && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Component Stack:</p>
                    <pre className="text-xs text-gray-700 font-mono overflow-x-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>

            {/* Error Count Warning */}
            {this.state.errorCount > 1 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> This error has occurred {this.state.errorCount} times. 
                  Consider reloading the page or contacting support.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
              
              <button
                onClick={this.handleReportBug}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                <Bug className="w-5 h-5" />
                Report Bug
              </button>
            </div>

            {/* Support Info */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>
                If this problem persists, please contact support at{' '}
                <a href="mailto:support@poslytic.com" className="text-primary hover:underline">
                  support@poslytic.com
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
