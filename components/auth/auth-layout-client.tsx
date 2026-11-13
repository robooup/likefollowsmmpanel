'use client';

import Footer from '@/components/frontend/footer';
import Header from '@/components/frontend/header';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonPublicShell from '@/components/themes/carbon/public-shell';

interface AuthLayoutClientProps {
  children: React.ReactNode;
}

export default function AuthLayoutClient({ children }: AuthLayoutClientProps) {
  const pathname = usePathname();
  const isSignInPage = pathname === '/sign-in';
  const [maintenanceMode, setMaintenanceMode] = useState<'inactive' | 'active'>('inactive');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchMaintenanceMode = async () => {
      try {
        const response = await fetch('/api/public/general-settings');
        if (response.ok && isMounted) {
          const data = await response.json();
          if (data.success && data.generalSettings?.maintenanceMode) {
            setMaintenanceMode(data.generalSettings.maintenanceMode);
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error fetching maintenance mode:', error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMaintenanceMode();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const showHeaderFooter = !(isSignInPage && maintenanceMode === 'active');
  const userTheme = useUserTheme();

  if (userTheme === 'carbon') {
    return <CarbonPublicShell>{children}</CarbonPublicShell>;
  }

  return (
    <>
      {showHeaderFooter && <Header />}
      <main className="flex-center w-full">{children}</main>
      {showHeaderFooter && <Footer />}
    </>
  );
}
