import { db } from '@/lib/db';
import { createTenantCache } from '@/lib/tenant/key';

interface ModuleSettings {
  affiliateSystemEnabled: boolean;
  commissionRate: number;
  minimumPayout: number;
  servicePurchaseEarningCount: string;
  childPanelSellingEnabled: boolean;
  childPanelPrice: number;
  serviceUpdateLogsEnabled: boolean;
  massOrderEnabled: boolean;
  servicesListPublic: boolean;
}

const DEFAULT_MODULE_SETTINGS: ModuleSettings = {
  affiliateSystemEnabled: false,
  commissionRate: 5,
  minimumPayout: 10,
  servicePurchaseEarningCount: '1',
  childPanelSellingEnabled: false,
  childPanelPrice: 10,
  serviceUpdateLogsEnabled: true,
  massOrderEnabled: false,
  servicesListPublic: true,
};

const CACHE_DURATION = 5 * 60 * 1000;
const settingsCache = createTenantCache<ModuleSettings>(CACHE_DURATION);

export async function getModuleSettings(bypassCache = false): Promise<ModuleSettings> {
  if (!bypassCache) {
    const cached = settingsCache.get();
    if (cached) return cached;
  }
  let cachedModuleSettings: ModuleSettings;

  try {
    const settings = await db.moduleSettings.findFirst();
    if (settings) {
      cachedModuleSettings = {
        affiliateSystemEnabled: settings.affiliateSystemEnabled ?? DEFAULT_MODULE_SETTINGS.affiliateSystemEnabled,
        commissionRate: settings.commissionRate ?? DEFAULT_MODULE_SETTINGS.commissionRate,
        minimumPayout: settings.minimumPayout ?? DEFAULT_MODULE_SETTINGS.minimumPayout,
        servicePurchaseEarningCount: settings.servicePurchaseEarningCount ?? '1',
        childPanelSellingEnabled: settings.childPanelSellingEnabled ?? DEFAULT_MODULE_SETTINGS.childPanelSellingEnabled,
        childPanelPrice: settings.childPanelPrice ?? DEFAULT_MODULE_SETTINGS.childPanelPrice,
        serviceUpdateLogsEnabled: settings.serviceUpdateLogsEnabled ?? DEFAULT_MODULE_SETTINGS.serviceUpdateLogsEnabled,
        massOrderEnabled: settings.massOrderEnabled ?? DEFAULT_MODULE_SETTINGS.massOrderEnabled,
        servicesListPublic: settings.servicesListPublic ?? DEFAULT_MODULE_SETTINGS.servicesListPublic,
      };
      settingsCache.set(cachedModuleSettings);
      return cachedModuleSettings;
    }
  } catch (error) {
    console.warn('Failed to fetch module settings from database:', error);
    throw error;
  }

  cachedModuleSettings = { ...DEFAULT_MODULE_SETTINGS };
  settingsCache.set(cachedModuleSettings);
  return cachedModuleSettings;
}

export function clearModuleSettingsCache(): void {
  settingsCache.clear();
}

