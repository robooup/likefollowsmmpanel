import { db } from '@/lib/db';
import { createTenantCache } from '@/lib/tenant/key';

interface TicketSettings {
  ticketSystemEnabled: boolean;
  maxPendingTickets: string;
}

const DEFAULT_TICKET_SETTINGS: TicketSettings = {
  ticketSystemEnabled: false,
  maxPendingTickets: '3',
};

const CACHE_DURATION = 5 * 60 * 1000;
const settingsCache = createTenantCache<TicketSettings>(CACHE_DURATION);

export async function getTicketSettings(bypassCache = false): Promise<TicketSettings> {
  if (!bypassCache) {
    const cached = settingsCache.get();
    if (cached) return cached;
  }
  let cachedTicketSettings: TicketSettings;

  try {
    const settings = await db.ticketSettings.findFirst();
    if (settings) {
      cachedTicketSettings = {
        ticketSystemEnabled: settings.ticketSystemEnabled ?? DEFAULT_TICKET_SETTINGS.ticketSystemEnabled,
        maxPendingTickets: settings.maxPendingTickets || DEFAULT_TICKET_SETTINGS.maxPendingTickets,
      };
      settingsCache.set(cachedTicketSettings);
      return cachedTicketSettings;
    }
  } catch (error) {
    console.warn('Failed to fetch ticket settings from database:', error);
    throw error;
  }

  cachedTicketSettings = { ...DEFAULT_TICKET_SETTINGS };
  settingsCache.set(cachedTicketSettings);
  return cachedTicketSettings;
}

export function clearTicketSettingsCache(): void {
  settingsCache.clear();
}