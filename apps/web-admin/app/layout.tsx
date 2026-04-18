import React from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'POSLytic - Admin Dashboard',
  description: 'Smart Restaurant Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
