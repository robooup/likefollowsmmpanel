'use client';

import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonPublicShell from '@/components/themes/carbon/public-shell';
import CarbonLanding from '@/components/themes/carbon/landing';

/** Wraps public pages in the active theme's header/footer; `fallback` is the default theme's chrome. */
export function PublicChrome({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const theme = useUserTheme();
  if (theme === 'carbon') return <CarbonPublicShell>{children}</CarbonPublicShell>;
  return <>{fallback}</>;
}

/** Home page content: the active theme's landing, or the default sections passed as children. */
export function HomeContent({ children }: { children: React.ReactNode }) {
  const theme = useUserTheme();
  if (theme === 'carbon') return <CarbonLanding />;
  return <>{children}</>;
}
