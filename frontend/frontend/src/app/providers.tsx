'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

const publicPaths = ['/login'];

export function Providers({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (isAuthenticated === null) return; // Still loading

    const isPublicPath = publicPaths.includes(pathname);

    if (!isAuthenticated && !isPublicPath) {
      // Not logged in and trying to access protected page
      router.replace('/login');
    }
  }, [isAuthenticated, pathname, router]);

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Public pages (login) - render without layout
  if (publicPaths.includes(pathname)) {
    return <>{children}</>;
  }

  // Protected pages - render with layout if authenticated
  if (isAuthenticated) {
    return <Layout>{children}</Layout>;
  }

  // Not authenticated, show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-gray-400">Redirecting to login...</p>
      </div>
    </div>
  );
}
