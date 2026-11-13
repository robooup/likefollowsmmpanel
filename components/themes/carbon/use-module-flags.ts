'use client';

import { useEffect, useState } from 'react';

export interface ModuleFlags {
  tickets: boolean;
  contact: boolean;
  affiliate: boolean;
  childPanel: boolean;
  massOrder: boolean;
  serviceUpdates: boolean;
}

const ENDPOINTS: Record<keyof ModuleFlags, [url: string, field: string]> = {
  tickets: ['/api/ticket-system-status', 'ticketSystemEnabled'],
  contact: ['/api/contact-system-status', 'contactSystemEnabled'],
  affiliate: ['/api/affiliate-system-status', 'affiliateSystemEnabled'],
  childPanel: ['/api/child-panel-system-status', 'childPanelSellingEnabled'],
  massOrder: ['/api/mass-order-system-status', 'massOrderEnabled'],
  serviceUpdates: ['/api/service-update-logs-status', 'serviceUpdateLogsEnabled'],
};

const ALL_OFF: ModuleFlags = {
  tickets: false,
  contact: false,
  affiliate: false,
  childPanel: false,
  massOrder: false,
  serviceUpdates: false,
};

/** Which optional modules the panel admin has switched on (same endpoints the default sidebar uses). */
export function useModuleFlags(): ModuleFlags {
  const [flags, setFlags] = useState<ModuleFlags>(ALL_OFF);

  useEffect(() => {
    let cancelled = false;
    (Object.keys(ENDPOINTS) as (keyof ModuleFlags)[]).forEach(async (key) => {
      const [url, field] = ENDPOINTS[key];
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setFlags((prev) => ({ ...prev, [key]: Boolean(data?.[field]) }));
      } catch {
        // Leave the module hidden if its status cannot be read.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return flags;
}
