'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Utensils,
  Users,
  Package,
  Receipt,
  Settings,
  BarChart3,
  LogOut,
  Building2,
  Megaphone,
  Star,
  BookOpen,
  Globe,
  FileText,
  QrCode,
} from 'lucide-react';
import { clearAuth, getUser } from '../lib/auth';

const navItems = [
  {
    href: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF', 'KITCHEN', 'RIDER'],
  },
  {
    href: '/menu',
    icon: Utensils,
    label: 'Menu',
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
  },
  {
    href: '/orders',
    icon: Receipt,
    label: 'Orders',
    roles: ['ADMIN', 'MANAGER', 'STAFF', 'CASHIER'],
  },
  {
    href: '/staff',
    icon: Users,
    label: 'Staff',
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
  },
  {
    href: '/inventory',
    icon: Package,
    label: 'Inventory',
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    href: '/reports',
    icon: BarChart3,
    label: 'Reports',
    roles: ['ADMIN', 'MANAGER', 'CASHIER'],
  },
  {
    href: '/branches',
    icon: Building2,
    label: 'Branches',
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    href: '/marketing',
    icon: Megaphone,
    label: 'Marketing',
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    href: '/reviews',
    icon: Star,
    label: 'Reviews',
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    href: '/finance',
    icon: BookOpen,
    label: 'Finance',
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    href: '/tax',
    icon: FileText,
    label: 'Tax Filings',
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    href: '/qr-codes',
    icon: QrCode,
    label: 'QR Codes',
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    href: '/external-orders',
    icon: Globe,
    label: 'External Orders',
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
    roles: ['ADMIN', 'MANAGER'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  if (!user) {
    return null;
  }

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold">POSLytic</h1>
        <p className="text-sm text-slate-400">Restaurant Admin</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-6 py-3 text-slate-400 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
