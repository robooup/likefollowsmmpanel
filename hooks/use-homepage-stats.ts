'use client';

import { useQuery } from '@tanstack/react-query';
import type { HomepageStatsData } from '@/lib/homepage-stats-browser-cache';

async function fetchHomepageStats(): Promise<HomepageStatsData> {
  const res = await fetch('/api/homepage/stats', { cache: 'no-store' });
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || json.message || 'Failed to fetch homepage stats');
  }

  const raw = json?.data ?? {};
  return {
    completedOrders: typeof raw.completedOrders === 'number' ? raw.completedOrders : 0,
    activeServices: typeof raw.activeServices === 'number' ? raw.activeServices : 0,
    activeUsers: typeof raw.activeUsers === 'number' ? raw.activeUsers : 0,
    activeAffiliateUsers: typeof raw.activeAffiliateUsers === 'number' ? raw.activeAffiliateUsers : 0,
    totalUsers: typeof raw.totalUsers === 'number' ? raw.totalUsers : 0,
    totalOrders: typeof raw.totalOrders === 'number' ? raw.totalOrders : 0,
  };
}

export const HOMEPAGE_STATS_QUERY_KEY = ['homepage-stats'] as const;

export function useHomepageStats() {
  return useQuery({
    queryKey: HOMEPAGE_STATS_QUERY_KEY,
    queryFn: fetchHomepageStats,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
