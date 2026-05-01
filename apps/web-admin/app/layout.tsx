'use client';

import React, { useEffect, useState } from 'react';
import './globals.css';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import { apiClient } from './lib/api';
import { clearAuth, getToken, getUser } from './lib/auth';

// Auth wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const isPublicQr = pathname?.startsWith('/qr/');

  useEffect(() => {
    if (isPublicQr) {
      setIsAuthenticated(true);
      return;
    }
    const verifySession = async () => {
      const token = getToken();
      const user = getUser();

      if (token && user) {
        setIsAuthenticated(true);
        return;
      }

      if (!token) {
        setIsAuthenticated(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
        return;
      }

      try {
        const response = await apiClient.get('/auth/verify');
        const verifiedUser = response.data.data.user;
        localStorage.setItem('user', JSON.stringify(verifiedUser));
        setIsAuthenticated(true);
      } catch (error) {
        clearAuth();
        setIsAuthenticated(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    };

    verifySession();
  }, [pathname, router, isPublicQr]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (pathname === '/login' || isPublicQr) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--color-bg)' }}>
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        {/* QA C1: external script (not inline) so CSP can drop 'unsafe-inline' */}
        <script src="/theme-bootstrap.js" />

      </head>
      <body style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
        <AuthWrapper>
          {children}
        </AuthWrapper>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
