'use client';

import React, { useEffect, useState } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import { apiClient } from './lib/api';
import { clearAuth } from './lib/auth';

const inter = Inter({ subsets: ['latin'] });

function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;
  // Check for consistent token key
  return document.cookie.split(';').some((cookie) => cookie.trim().startsWith('token='));
}

// Auth wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const verifySession = async () => {
      // Use same keys as POS Desktop for consistency
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      const cookieExists = hasAuthCookie();

      if (token && user) {
        setIsAuthenticated(true);
        return;
      }

      if (!cookieExists && !token) {
        setIsAuthenticated(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
        return;
      }

      try {
        const response = await apiClient.get('/auth/verify');
        const verifiedUser = response.data.data.user;
        // Store with consistent keys
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
  }, [pathname, router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
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
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <AuthWrapper>
          {children}
        </AuthWrapper>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
