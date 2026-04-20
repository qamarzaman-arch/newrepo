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
} from 'lucide-react';
import { clearAuth } from '../lib/auth';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/menu', icon: Utensils, label: 'Menu' },
  { href: '/staff', icon: Users, label: 'Staff' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/orders', icon: Receipt, label: 'Orders' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold">POSLytic</h1>
        <p className="text-sm text-slate-400">Restaurant Admin</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
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
