import { Suspense } from 'react';
import SettingsTabs from '@/components/admin/settings-tabs';

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-shell">
      <Suspense fallback={null}>
        <SettingsTabs />
      </Suspense>
      <div className="settings-shell-body">{children}</div>
    </div>
  );
}
