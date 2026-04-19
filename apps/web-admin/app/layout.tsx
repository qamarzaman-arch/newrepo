'use client';

import React, { useEffect, useState } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { useRouter, usePathname } from 'next/navigation';

import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

// Auth wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      setIsAuthenticated(false);
      if (pathname !== '/login') {
        router.push('/login');
      }
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Don't wrap login page with auth check
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Require auth for all other pages
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <div className="min-h-screen flex flex-col">
          <AuthWrapper>
            {children}
          </AuthWrapper>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
