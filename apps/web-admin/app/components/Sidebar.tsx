'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Utensils,
  Users,
  Package,
  BarChart3,
  LogOut,
  Building2,
  Megaphone,
  Star,
  BookOpen,
  Globe,
  FileText,
  QrCode,
  ChefHat,
  ShoppingCart,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { clearAuth, getUser } from '../lib/auth';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles: string[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF', 'KITCHEN', 'RIDER'] },
      { href: '/reports', icon: BarChart3, label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/menu', icon: Utensils, label: 'Menu', roles: ['ADMIN', 'MANAGER'] },
      { href: '/recipes', icon: ChefHat, label: 'Recipes', roles: ['ADMIN', 'MANAGER'] },
      { href: '/inventory', icon: Package, label: 'Inventory', roles: ['ADMIN', 'MANAGER'] },
      { href: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/staff', icon: Users, label: 'Staff', roles: ['ADMIN', 'MANAGER'] },
      { href: '/staff-schedule', icon: CalendarDays, label: 'Schedules', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/branches', icon: Building2, label: 'Branches', roles: ['ADMIN', 'MANAGER'] },
      { href: '/delivery-zones', icon: MapPin, label: 'Delivery Zones', roles: ['ADMIN', 'MANAGER'] },
      { href: '/qr-codes', icon: QrCode, label: 'QR Codes', roles: ['ADMIN', 'MANAGER'] },
      { href: '/external-orders', icon: Globe, label: 'External Orders', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/finance', icon: BookOpen, label: 'Finance', roles: ['ADMIN', 'MANAGER'] },
      { href: '/tax', icon: FileText, label: 'Tax Filings', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { href: '/marketing', icon: Megaphone, label: 'Marketing', roles: ['ADMIN', 'MANAGER'] },
      { href: '/reviews', icon: Star, label: 'Reviews', roles: ['ADMIN', 'MANAGER'] },
    ],
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
        <p className="text-xs text-slate-500 mt-1">{user.fullName ?? user.username} · {user.role}</p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navSections.map((section) => {
          const visible = section.items.filter((item) => item.roles.includes(user.role));
          if (visible.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              <p className="px-6 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              {visible.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
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
