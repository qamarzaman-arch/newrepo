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
  ClipboardList,
  TableProperties,
  UserCheck,
  Shield,
  Settings,
  Truck,
  Sun,
  Moon,
} from 'lucide-react';
import { clearAuth, getUser } from '../lib/auth';
import { useEffect, useState } from 'react';

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
    title: 'Live Operations',
    items: [
      { href: '/orders', icon: ClipboardList, label: 'Orders', roles: ['ADMIN', 'MANAGER', 'STAFF', 'CASHIER'] },
      { href: '/kitchen', icon: ChefHat, label: 'Kitchen Display', roles: ['ADMIN', 'MANAGER', 'KITCHEN'] },
      { href: '/tables', icon: TableProperties, label: 'Tables', roles: ['ADMIN', 'MANAGER', 'STAFF', 'CASHIER'] },
      { href: '/delivery-zones', icon: Truck, label: 'Delivery', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/menu', icon: Utensils, label: 'Menu', roles: ['ADMIN', 'MANAGER'] },
      { href: '/recipes', icon: BookOpen, label: 'Recipes', roles: ['ADMIN', 'MANAGER'] },
      { href: '/inventory', icon: Package, label: 'Inventory', roles: ['ADMIN', 'MANAGER'] },
      { href: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
  {
    title: 'People',
    items: [
      { href: '/customers', icon: Users, label: 'Customers', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
      { href: '/staff', icon: Users, label: 'Staff', roles: ['ADMIN', 'MANAGER'] },
      { href: '/staff-schedule', icon: CalendarDays, label: 'Schedules', roles: ['ADMIN', 'MANAGER'] },
      { href: '/attendance', icon: UserCheck, label: 'Attendance', roles: ['ADMIN', 'MANAGER'] },
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
  {
    title: 'Administration',
    items: [
      { href: '/branches', icon: Building2, label: 'Branches', roles: ['ADMIN', 'MANAGER'] },
      { href: '/qr-codes', icon: QrCode, label: 'QR Codes', roles: ['ADMIN', 'MANAGER'] },
      { href: '/external-orders', icon: Globe, label: 'External Orders', roles: ['ADMIN', 'MANAGER'] },
      { href: '/feature-access', icon: Shield, label: 'Feature Access', roles: ['ADMIN'] },
      { href: '/settings', icon: Settings, label: 'Settings', roles: ['ADMIN', 'MANAGER'] },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = getUser();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('poslytic-theme');
    const initial: 'light' | 'dark' =
      saved === 'dark' || (saved === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark'
        : saved === 'light'
          ? 'light'
          : document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(initial);
    if (initial === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('poslytic-theme', next);
    if (next === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  if (!user) {
    return null;
  }

  return (
    <aside
      className="w-64 min-h-screen flex flex-col"
      style={{ backgroundColor: '#AA0000', color: '#FBFBFB' }}
    >
      <div className="p-6 border-b border-white/15 flex items-center gap-3">
        <img src="/logo.png" alt="POSLytic" className="h-12 w-auto bg-white rounded-lg p-1" />
        <div>
          <h1 className="text-xl font-bold tracking-wide" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>POSLYTIC</h1>
          <p className="text-xs text-white/70">{user.fullName ?? user.username} · {user.role}</p>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navSections.map((section) => {
          const visible = section.items.filter((item) => item.roles.includes(user.role));
          if (visible.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              <p className="px-6 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                {section.title}
              </p>
              {visible.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-6 py-2.5 text-sm transition-colors"
                    style={
                      isActive
                        ? { backgroundColor: '#FFFFFF', color: '#AA0000', fontWeight: 600 }
                        : { color: '#FBFBFB' }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
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

      <div className="p-4 border-t border-white/15 flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg w-full transition-colors text-sm"
          style={{ color: '#FBFBFB', backgroundColor: 'rgba(255,255,255,0.10)' }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg w-full transition-colors text-sm"
          style={{ color: '#FBFBFB' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
