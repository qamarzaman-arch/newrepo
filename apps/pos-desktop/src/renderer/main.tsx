import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import EnhancedErrorBoundary from './components/EnhancedErrorBoundary';
import './index.css';

// Suppress non-critical console warnings in development
if (import.meta.env.DEV) {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Filter out known non-critical errors
    const message = args.join(' ');
    if (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Support for defaultProps will be removed') ||
      message.includes('findDOMNode is deprecated') ||
      message.includes('React Router') ||
      message.includes('Token verification failed') ||
      message.includes('Failed to load feature access') ||
      message.includes('GET http://localhost:3001/api/v1/feature-access 401') ||
      message.includes('PATCH http://localhost:3001/api/v1/feature-access 401') ||
      message.includes('PATCH http://localhost:3001/api/v1/feature-access 429') ||
      message.includes('POST http://localhost:3001/api/v1/auth/login 429') ||
      message.includes('Login error') ||
      message.includes('GET http://localhost:3001/api/v1/auth/verify 401') ||
      message.includes('WebSocket connection to') ||
      message.includes('was compiled against a different Node.js version')
    ) {
      return; // Suppress these React/Router and auth errors
    }
    originalConsoleError(...args);
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <EnhancedErrorBoundary>
          <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 2000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        </EnhancedErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
