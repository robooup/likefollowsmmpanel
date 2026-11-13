'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AffiliateStats {
  visits: number;
  registrations: number;
  referrals: number;
  conversionRate: string;
  totalEarnings: string;
  availableEarnings: string;
  commissionRate: string;
  minimumPayout: string;
  referralCode?: string | null;
  status?: string;
}

export interface AffiliatePayout {
  id: number;
  amount: number;
  status: string;
  payment_method?: string;
  createdAt: string;
}

export interface AffiliateEarning {
  id: number;
  signupDate: string;
  service: string;
  amount: number;
  commission: number;
  status: string;
  user: { id: number; name: string; username?: string };
}

type ToastState = { message: string; type: 'success' | 'error' | 'info' | 'pending' } | null;

const EMPTY_STATS: AffiliateStats = {
  visits: 0,
  registrations: 0,
  referrals: 0,
  conversionRate: '0.00%',
  totalEarnings: '$0.00',
  availableEarnings: '$0.00',
  commissionRate: '0%',
  minimumPayout: '$0.00',
};

const METHOD_NAMES: Record<string, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  upay: 'Upay',
  bank: 'Bank Transfer',
};

const toNumber = (text: unknown, fallback: number) => {
  const value = parseFloat(String(text ?? '').replace(/[^0-9.]/g, ''));
  return isNaN(value) ? fallback : value;
};

// Affiliate overview: stats, payouts, earnings and the withdrawal request, without any markup.
export function useAffiliate() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AffiliateStats>(EMPTY_STATS);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [toast, setToast] = useState<ToastState>(null);

  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    selectedWithdrawalMethod: '',
    paymentDetails: '',
  });
  const [withdrawalProcessing, setWithdrawalProcessing] = useState(false);
  const [savedWithdrawalMethods, setSavedWithdrawalMethods] = useState<any[]>([]);

  const showToast = useCallback((message: string, type: NonNullable<ToastState>['type'] = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/user/affiliate/stats');
      if (!res.ok) throw new Error('stats');
      const json = await res.json();
      if (json?.success && json.data) {
        setStats({ ...EMPTY_STATS, ...json.data });
        setIsActive(json.data.status === 'active');
        return;
      }
      setIsActive(false);
    } catch {
      setIsActive(false);
    }
  }, []);

  const loadLists = useCallback(async () => {
    const [payoutRes, earningRes, methodRes] = await Promise.allSettled([
      fetch('/api/user/affiliate/withdrawals?page=1&limit=20').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/user/affiliate/earnings?page=1&limit=20').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/user/affiliate/payment-methods').then((r) => (r.ok ? r.json() : null)),
    ]);
    if (payoutRes.status === 'fulfilled' && payoutRes.value) setPayouts(payoutRes.value.transactions || []);
    if (earningRes.status === 'fulfilled' && earningRes.value) setEarnings(earningRes.value.data || []);
    if (methodRes.status === 'fulfilled' && methodRes.value?.success) {
      const list = methodRes.value.data || [];
      setSavedWithdrawalMethods(list);
      if (list.length > 0) {
        setWithdrawalForm((prev) =>
          prev.selectedWithdrawalMethod ? prev : { ...prev, selectedWithdrawalMethod: list[0].id }
        );
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadStats();
      await loadLists();
      setLoading(false);
    })();
  }, [loadStats, loadLists]);

  const referralLink =
    typeof window !== 'undefined' && stats.referralCode ? `${window.location.origin}/ref/${stats.referralCode}` : '';

  const copyReferralLink = async () => {
    if (!referralLink) return;
    // The async clipboard API can stay pending (permission prompt, unfocused tab), so fall back after a moment.
    const legacyCopy = () => {
      const area = document.createElement('textarea');
      area.value = referralLink;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(area);
      return ok;
    };
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        copied = await Promise.race([
          navigator.clipboard.writeText(referralLink).then(() => true),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 600)),
        ]);
      }
    } catch {
      copied = false;
    }
    if (!copied) copied = legacyCopy();
    showToast(copied ? 'Referral link copied!' : 'Failed to copy', copied ? 'success' : 'error');
  };

  const minWithdrawalValue = toNumber(stats.minimumPayout, 10);
  const availableBalance = toNumber(stats.availableEarnings, 0);
  const availableBalanceDisplay = stats.availableEarnings || '';

  const getWithdrawalMethodDisplayName = (method: string): string =>
    METHOD_NAMES[(method || '').toLowerCase()] || method;
  const getWithdrawalMethodOptionLabel = (m: any): string => getWithdrawalMethodDisplayName(m.method);

  const isWithdrawalFormValid = () => {
    const amount = parseFloat(withdrawalForm.amount);
    if (!withdrawalForm.amount.trim() || isNaN(amount) || amount <= 0) return false;
    if (amount < minWithdrawalValue || amount > availableBalance) return false;
    if (!withdrawalForm.selectedWithdrawalMethod) return false;
    return savedWithdrawalMethods.some(
      (wm) => String(wm.id) === String(withdrawalForm.selectedWithdrawalMethod)
    );
  };

  const handleWithdrawalRequest = async () => {
    const amount = parseFloat(withdrawalForm.amount);
    if (!withdrawalForm.amount || isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid withdrawal amount', 'error');
      return;
    }
    if (!withdrawalForm.selectedWithdrawalMethod) {
      showToast('Please select a withdrawal method', 'error');
      return;
    }
    if (amount < minWithdrawalValue) {
      showToast(`Minimum withdrawal amount is ${minWithdrawalValue}`, 'error');
      return;
    }
    try {
      setWithdrawalProcessing(true);
      const response = await fetch('/api/user/affiliate/withdrawal-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, withdrawalMethodId: withdrawalForm.selectedWithdrawalMethod }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to submit withdrawal request');
      }
      showToast(data.message || 'Withdrawal request submitted successfully!', 'success');
      setWithdrawalModalOpen(false);
      setWithdrawalForm({ amount: '', selectedWithdrawalMethod: '', paymentDetails: '' });
      await loadStats();
      await loadLists();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error submitting withdrawal request', 'error');
    } finally {
      setWithdrawalProcessing(false);
    }
  };

  return {
    router,
    loading,
    isActive,
    stats,
    payouts,
    earnings,
    toast,
    setToast,
    referralLink,
    copyReferralLink,
    withdrawalModalOpen,
    setWithdrawalModalOpen,
    withdrawalForm,
    setWithdrawalForm,
    withdrawalProcessing,
    savedWithdrawalMethods,
    minWithdrawalValue,
    availableBalance,
    availableBalanceDisplay,
    getWithdrawalMethodDisplayName,
    getWithdrawalMethodOptionLabel,
    isWithdrawalFormValid,
    handleWithdrawalRequest,
  };
}
