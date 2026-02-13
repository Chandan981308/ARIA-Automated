'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Phone,
  BarChart3,
  Shield,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Bell,
  ChevronDown,
  LayoutGrid,
  History,
  Hash,
  FileText,
  Mic,
  Link2,
  Workflow,
  BookOpen,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
      { name: 'Leads', href: '/leads', icon: Users },
      { name: 'Calls', href: '/calls', icon: Phone },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Compliance', href: '/compliance', icon: Shield },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  {
    label: 'Platform',
    items: [
      { name: 'Agent Setup', href: '/agent-setup', icon: LayoutGrid },
      { name: 'Call History', href: '/call-history', icon: History },
      { name: 'My Numbers', href: '/my-numbers', icon: Hash },
      { name: 'Knowledge Base', href: '/knowledge-base', icon: FileText },
    ],
  },
  {
    items: [
      { name: 'Voice Lab', href: '/voice-lab', icon: Mic },
      { name: 'Sales Agent', href: '/sales-agent', icon: Bot },
    ],
  },
  {
    items: [
      { name: 'Providers', href: '/providers', icon: Link2 },
      { name: 'Workflows', href: '/workflows', icon: Workflow },
    ],
  },
  {
    items: [
      { name: 'Documentation', href: '/documentation', icon: BookOpen },
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Initialize dark mode
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      const isDark = savedDarkMode === 'true';
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Default to dark mode
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getUserInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'U';
  };

  return (
    <div className={cn('min-h-screen bg-gray-100 dark:bg-gray-900', darkMode && 'dark')}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b dark:border-gray-700">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">ARIA</span>
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {navigationSections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              {/* Section divider (skip for first section) */}
              {sectionIdx > 0 && (
                <div className="my-3 border-t dark:border-gray-700" />
              )}

              {/* Section label */}
              {section.label && (
                <p className="px-4 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {section.label}
                </p>
              )}

              {/* Section items */}
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar footer with version */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t dark:border-gray-700">
          <div className="text-xs text-gray-400 text-center">
            ARIA v1.0.0 | TRAI Compliant
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shadow-sm">
          <div className="flex h-full items-center justify-between px-4 lg:px-6">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 pl-3 border-l dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg py-1 pr-2 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role === 'admin' ? 'Administrator' : 'Sales Rep'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50">
                      <div className="px-4 py-2 border-b dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.full_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </p>
                      </div>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4 inline mr-2" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <LogOut className="w-4 h-4 inline mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
