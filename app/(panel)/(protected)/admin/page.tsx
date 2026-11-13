'use client';

import { useCurrency } from '@/contexts/currency-context';
import axiosInstance from '@/lib/axios-instance';
import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Announcements from '@/components/dashboard/announcements';
import { useSelector } from 'react-redux';
import { getUserDetails } from '@/lib/actions/getUser';
import {
    FaAward,
    FaBullseye,
    FaCalendar,
    FaChartLine,
    FaCheckCircle,
    FaClock,
    FaCog,
    FaCommentDots,
    FaDollarSign,
    FaEllipsisH,
    FaExclamationCircle,
    FaEye,
    FaRedo,
    FaShoppingCart,
    FaSync,
    FaTimes,
    FaTimesCircle,
    FaUserPlus,
    FaUsers,
} from 'react-icons/fa';

const TransactionsTable = dynamic(
  () => import('@/components/admin/transactions/transactions-table'),
  { ssr: false }
);

const ApproveTransactionModal = dynamic(
  () => import('@/components/admin/transactions/modals/approve-transaction'),
  { ssr: false }
);

const CancelTransactionModal = dynamic(
  () => import('@/components/admin/transactions/modals/cancel-transaction'),
  { ssr: false }
);

const TransactionsTableSkeleton = () => {
  const rows = Array.from({ length: 3 });
  
  return (
    <>
      <div className="hidden lg:block overflow-x-auto min-h-[300px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white dark:bg-[var(--card-bg)] border-b dark:border-gray-700 z-10">
            <tr>
              {Array.from({ length: 9 }).map((_, idx) => (
                <th key={idx} className="text-left p-3 text-gray-900 dark:text-gray-100">
                  <div className="h-4 rounded w-3/4 gradient-shimmer" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((_, rowIdx) => (
              <tr key={rowIdx} className="border-t dark:border-gray-700">
                <td className="p-3">
                  <div className="h-6 w-16 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-24 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-24 gradient-shimmer rounded mb-1" />
                  <div className="h-3 w-20 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-32 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-20 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-24 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-20 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-6 w-20 gradient-shimmer rounded-full" />
                </td>
                <td className="p-3">
                  <div className="flex gap-2 justify-center">
                    <div className="h-8 w-8 gradient-shimmer rounded" />
                    <div className="h-8 w-8 gradient-shimmer rounded" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lg:hidden">
        <div className="space-y-4" style={{ padding: '24px 0 0 0' }}>
          {rows.map((_, idx) => (
            <div key={idx} className="card card-padding border-l-4 border-yellow-500 dark:border-yellow-400 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-16 gradient-shimmer rounded" />
                <div className="h-6 w-20 gradient-shimmer rounded-full" />
              </div>
              <div className="mb-4 pb-4 border-b dark:border-gray-700">
                <div className="h-4 w-32 gradient-shimmer rounded" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-4 w-20 gradient-shimmer rounded" />
                <div className="h-4 w-24 gradient-shimmer rounded" />
              </div>
              <div className="mb-4">
                <div className="h-4 w-20 gradient-shimmer rounded" />
              </div>
              <div className="mb-4">
                <div className="h-3 w-24 gradient-shimmer rounded mb-1" />
                <div className="h-3 w-20 gradient-shimmer rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-10 flex-1 gradient-shimmer rounded" />
                <div className="h-10 flex-1 gradient-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const LatestUsers = dynamic(
  () => import('@/components/admin/main/latest-users'),
  { ssr: false }
);

const UsersTableSkeleton = () => {
  const rows = Array.from({ length: 5 });
  
  return (
    <>
      <div className="hidden lg:block overflow-x-auto min-h-[400px]">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="sticky top-0 bg-white dark:bg-[var(--card-bg)] border-b dark:border-gray-700 z-10">
            <tr>
              {Array.from({ length: 5 }).map((_, idx) => (
                <th key={idx} className="text-left p-3 text-gray-900 dark:text-gray-100">
                  <div className="h-4 rounded w-3/4 gradient-shimmer" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((_, rowIdx) => (
              <tr key={rowIdx} className="border-t dark:border-gray-700">
                <td className="p-3">
                  <div className="h-6 w-16 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-24 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-32 gradient-shimmer rounded mb-2" />
                  <div className="h-3 w-16 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-20 gradient-shimmer rounded" />
                </td>
                <td className="p-3">
                  <div className="h-4 w-24 gradient-shimmer rounded mb-1" />
                  <div className="h-3 w-20 gradient-shimmer rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="lg:hidden">
        <div className="space-y-4">
          {rows.map((_, idx) => (
            <div key={idx} className="card card-padding border-l-4 border-blue-500 dark:border-blue-400 mb-4">
              <div className="h-6 w-16 gradient-shimmer rounded mb-4" />
              <div className="space-y-4">
                <div className="h-4 w-32 gradient-shimmer rounded" />
                <div className="h-4 w-40 gradient-shimmer rounded" />
                <div className="h-4 w-24 gradient-shimmer rounded" />
                <div className="h-4 w-28 gradient-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const GradientSpinner = ({ size = 'w-16 h-16', className = '' }) => (
  <div className={`${size} ${className} relative`}>
    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-spin">
      <div className="absolute inset-1 rounded-full bg-white"></div>
    </div>
  </div>
);

const Toast = ({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error' | 'info' | 'pending';
  onClose: () => void;
}) => (
  <div className={`toast toast-${type} toast-enter`}>
    {type === 'success' && <FaCheckCircle className="toast-icon" />}
    <span className="font-medium">{message}</span>
    <button onClick={onClose} className="toast-close">
      <FaTimes className="toast-close-icon" />
    </button>
  </div>
);

const CACHE_KEYS = {
  DASHBOARD_STATS: 'admin_dashboard_stats',
  LATEST_USERS: 'admin_latest_users',
  PENDING_TRANSACTIONS: 'admin_pending_transactions',
  CACHE_TIMESTAMP: 'admin_cache_timestamp'
};

const CACHE_DURATIONS = {
  DASHBOARD_STATS: 2 * 60 * 1000,
  LATEST_USERS: 45 * 1000,
  PENDING_TRANSACTIONS: 30 * 1000,
  DEFAULT: 60 * 1000
};

const getCachedData = (key: string) => {
  try {
    if (typeof window === 'undefined') return null;
    const cached = sessionStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Error reading from cache:', error);
    return null;
  }
};

const setCachedData = (key: string, data: any) => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, JSON.stringify(data));

    const timestampKey = `${key}_timestamp`;
    sessionStorage.setItem(timestampKey, Date.now().toString());

    const versionKey = `${key}_version`;
    sessionStorage.setItem(versionKey, Math.random().toString(36).substr(2, 9));
  } catch (error) {
    console.warn('Error writing to cache:', error);
  }
};

const isCacheValid = (key: string) => {
  try {
    if (typeof window === 'undefined') return false;
    const timestampKey = `${key}_timestamp`;
    const timestamp = sessionStorage.getItem(timestampKey);
    if (!timestamp) return false;

    let duration = CACHE_DURATIONS.DEFAULT;
    if (key === CACHE_KEYS.DASHBOARD_STATS) duration = CACHE_DURATIONS.DASHBOARD_STATS;
    else if (key === CACHE_KEYS.LATEST_USERS) duration = CACHE_DURATIONS.LATEST_USERS;
    else if (key === CACHE_KEYS.PENDING_TRANSACTIONS) duration = CACHE_DURATIONS.PENDING_TRANSACTIONS;

    return Date.now() - parseInt(timestamp) < duration;
  } catch (error) {
    return false;
  }
};

const clearCache = () => {
  try {
    if (typeof window === 'undefined') return;
    Object.values(CACHE_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(`${key}_timestamp`);
      sessionStorage.removeItem(`${key}_version`);
    });
  } catch (error) {
    console.warn('Error clearing cache:', error);
  }
};

const invalidateCache = (key: string) => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(`${key}_timestamp`);
    sessionStorage.removeItem(`${key}_version`);
  } catch (error) {
    console.warn('Error invalidating cache:', error);
  }
};

interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  balance: number;
  total_spent: number;
  totalOrders: number;
  servicesDiscount: number;
  status: 'active' | 'suspended' | 'banned';
  currency: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
  role: 'user' | 'admin' | 'moderator';
}

interface PendingTransaction {
  id: number;
  invoice_id: number;
  userId: number;
  username?: string;
  amount: number;
  transaction_id?: string;
  status: string;
  admin_status: string;
  method?: string;
  payment_method?: string;
  currency?: string;
  createdAt: string;
  updatedAt?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

type Order = {
  id: number;
  usdPrice: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  service: {
    name: string;
  };
};

type DashboardStats = {
  totalOrders: number;
  totalUsers: number;
  totalServices: number;
  totalCategories: number;
  totalRevenue: number;
  totalPayments?: number;
  last30DaysRevenue?: number;
  recentOrders: Order[];
  ordersByStatus: {
    pending: number;
    processing: number;
    completed: number;
    cancelled: number;
    partial: number;
  };
  dailyOrders: {
    date: string;
    orders: number;
  }[];
  todaysOrders: number;
  todaysProfit: number;
  newUsersToday: number;
};

export default function AdminDashboardPage() {
  const { appName } = useAppNameWithFallback();
  const { data: session } = useSession();
  const userDetails = useSelector((state: any) => state.userDetails);
  const [timeFormat, setTimeFormat] = useState<string>('24');
  const [userTimezone, setUserTimezone] = useState<string>('Asia/Dhaka');

  useEffect(() => {
    setPageTitle('Admin Dashboard', appName);
  }, [appName]);

  useEffect(() => {
    const loadTimeFormat = async () => {
      const storedTimeFormat = (userDetails as any)?.timeFormat;
      const storedTimezone = (userDetails as any)?.timezone;
      
      if (storedTimeFormat === '12' || storedTimeFormat === '24') {
        setTimeFormat(storedTimeFormat);
      }
      
      if (storedTimezone) {
        setUserTimezone(storedTimezone);
      }

      try {
        const userData = await getUserDetails();
        const userTimeFormat = (userData as any)?.timeFormat || '24';
        const userTz = (userData as any)?.timezone || 'Asia/Dhaka';
        
        setTimeFormat(userTimeFormat === '12' || userTimeFormat === '24' ? userTimeFormat : '24');
        setUserTimezone(userTz);
      } catch (error) {
        console.error('Error loading time format:', error);
        setTimeFormat('24');
        setUserTimezone('Asia/Dhaka');
      }
    };

    loadTimeFormat();
  }, [userDetails]);

  const formatTime = useCallback((dateString: string | Date): string => {
    if (!dateString) return 'null';
    
    let date: Date;
    if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      return 'null';
    }
    
    if (isNaN(date.getTime())) return 'null';

    if (timeFormat === '12') {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: userTimezone,
      });
    } else {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: userTimezone,
      });
    }
  }, [timeFormat, userTimezone]);

  const formatDate = useCallback((dateString: string | Date): string => {
    if (!dateString) return 'null';
    
    let date: Date;
    if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      return 'null';
    }
    
    if (isNaN(date.getTime())) return 'null';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: userTimezone,
    });
  }, [userTimezone]);

  const { currency, rate, currentCurrencyData, availableCurrencies } = useCurrency();

  const userRole = session?.user?.role;
  const userPermissions = (session?.user as any)?.permissions as string[] | null | undefined;
  const hasTransactionsPermission = 
    userRole === 'admin' || 
    userRole === 'super_admin' || 
    (userRole === 'moderator' && userPermissions?.includes('all_transactions'));
  
  const hasUsersPermission = 
    userRole === 'admin' || 
    userRole === 'super_admin' || 
    (userRole === 'moderator' && userPermissions?.includes('users'));
  
  const isModerator = userRole === 'moderator';

  const queryClient = useQueryClient();
  const defaultStats: DashboardStats = {
    totalOrders: 0,
    totalUsers: 0,
    totalServices: 0,
    totalCategories: 0,
    totalRevenue: 0,
    totalPayments: 0,
    last30DaysRevenue: 0,
    recentOrders: [],
    ordersByStatus: { pending: 0, processing: 0, completed: 0, cancelled: 0, partial: 0 },
    dailyOrders: [],
    todaysOrders: 0,
    todaysProfit: 0,
    newUsersToday: 0,
  };

  const statsQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success || !json.data) throw new Error(json.error || 'Failed to load stats');
      return json.data as DashboardStats;
    },
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });

  const usersQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'latest-users'],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '5', role: 'user', sort: 'createdAt', order: 'desc' });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load users');
      const list = (json.data || []).filter((u: User) => u.role === 'user');
      return list.slice(0, 5) as User[];
    },
    enabled: !!hasUsersPermission,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });

  const transactionsQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'pending-transactions'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/api/transactions', {
        params: { admin: 'true', status: 'Pending', limit: 10, page: 1 },
        timeout: 15000,
      });
      let transactions: PendingTransaction[] = [];
      if (data?.success && Array.isArray(data.data)) transactions = data.data;
      else if (Array.isArray(data)) transactions = data;
      else if (data?.data && Array.isArray(data.data)) transactions = data.data;
      const pending = transactions.filter(
        (t: PendingTransaction) =>
          t.status === 'pending' || t.status === 'Processing' ||
          t.admin_status === 'Pending' || t.admin_status === 'pending'
      );
      return { list: pending.slice(0, 3), total: pending.length };
    },
    enabled: !!hasTransactionsPermission,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });

  const stats = statsQuery.data ?? defaultStats;
  const statsLoading = statsQuery.isLoading;
  const latestUsers = usersQuery.data ?? [];
  const latestUsersLoading = usersQuery.isLoading;
  const pendingTransactions = transactionsQuery.data?.list ?? [];
  const totalTransactionCount = transactionsQuery.data?.total ?? 0;
  const transactionsLoading = transactionsQuery.isLoading;

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);

  const [customToast, setCustomToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'pending';
  } | null>(null);

  const [approveConfirmDialog, setApproveConfirmDialog] = useState<{
    open: boolean;
    transactionId: number;
    transaction: PendingTransaction | null;
  }>({ open: false, transactionId: 0, transaction: null });

  const [cancelConfirmDialog, setCancelConfirmDialog] = useState<{
    open: boolean;
    transactionId: number;
    transaction: PendingTransaction | null;
  }>({ open: false, transactionId: 0, transaction: null });

  const [approveTransactionId, setApproveTransactionId] = useState('');
  const [defaultTransactionId, setDefaultTransactionId] = useState('');

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'pending' = 'success'
  ) => {
    setCustomToast({ message, type });
    setTimeout(() => setCustomToast(null), 4000);
  };

  const formatCurrency = useCallback((amount: number, currency: string) => {
    const formatters = {
      USD: (amt: number) => `${amt.toFixed(2)}`,
      BDT: (amt: number) => `৳${amt.toFixed(2)}`,
    };
    return (
      formatters[currency as keyof typeof formatters]?.(amount) ||
      `${amount.toFixed(2)}`
    );
  }, []);

  const formatTransactionCurrency = useCallback((amount: number, currency: string) => {
    const formatters: Record<string, (amt: number) => string> = {
      USD: (amt: number) => `$${amt.toFixed(2)}`,
      USDT: (amt: number) => `$${amt.toFixed(2)}`,
      BDT: (amt: number) => `৳${amt.toFixed(2)}`,
    };
    return (
      formatters[currency as keyof typeof formatters]?.(amount) ||
      `${currency} ${amount.toFixed(2)}`
    );
  }, []);

  const displayMethod = useCallback((transaction: PendingTransaction) => {
    const gateway = transaction.method || '';
    const methodName = transaction.payment_method || '';
    
    if (!gateway && !methodName) {
      return 'Unknown';
    }
    
    if (gateway && methodName) {
      return `${gateway} - ${methodName}`;
    }
    
    if (gateway && !methodName) {
      return `${gateway} - Unknown`;
    }
    
    return gateway || methodName;
  }, []);

  const formatID = useCallback((id: any) => {
    if (id === null || id === undefined) return 'null';
    const idStr = String(id);
    return idStr.length > 8 ? idStr.slice(-8) : idStr;
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'Success':
      case 'completed':
      case 'approved':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
            <FaCheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">Success</span>
          </div>
        );
      case 'Pending':
      case 'pending':
      case 'Processing':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full w-fit">
            <FaClock className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Pending</span>
          </div>
        );
      case 'Cancelled':
      case 'cancelled':
      case 'rejected':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full w-fit">
            <FaTimesCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">Cancel</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full w-fit">
            <FaClock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{status}</span>
          </div>
        );
    }
  }, []);

  const openViewDetailsDialog = useCallback((transaction: PendingTransaction) => {
    showToast(`Transaction ID: ${transaction.id}`, 'info');
  }, [showToast]);

  const openUpdateStatusDialog = useCallback((transactionId: number, currentStatus: string) => {
    showToast(`Update status for transaction ${transactionId}`, 'info');
  }, [showToast]);

  const handleApprove = useCallback((transactionId: string) => {
    const numericId = parseInt(transactionId);
    const transaction = pendingTransactions.find((t) => t.id === numericId);

    let defaultId = transaction?.transaction_id?.toString() || '';

    if (!defaultId) {
      const timestamp = new Date().getTime();
      defaultId = `DEP-${transaction?.id || ''}-${timestamp.toString().slice(-6)}`;
    }

    setDefaultTransactionId(defaultId);
    setApproveTransactionId(defaultId);

    setApproveConfirmDialog({
      open: true,
      transactionId: numericId,
      transaction: transaction || null,
    });
  }, [pendingTransactions]);

  const confirmApprove = useCallback(async (transactionId: number, modifiedTransactionId: string) => {
    try {
      const response = await fetch(
        `/api/admin/funds/${transactionId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modifiedTransactionId: modifiedTransactionId.trim(),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] }),
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'pending-transactions'] }),
        ]);
        showToast('Transaction approved successfully!', 'success');
        setApproveConfirmDialog({
          open: false,
          transactionId: 0,
          transaction: null,
        });
        setApproveTransactionId('');
      } else {
        showToast(result.error || 'Failed to approve transaction', 'error');
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      showToast('Error approving transaction', 'error');
    }
  }, [pendingTransactions, queryClient, showToast]);

  const handleCancel = useCallback((transactionId: string) => {
    const transaction = pendingTransactions.find((t) => t.id.toString() === transactionId);
    setCancelConfirmDialog({
      open: true,
      transactionId: parseInt(transactionId),
      transaction: transaction || null,
    });
  }, [pendingTransactions]);

  const confirmCancel = useCallback(async (transactionId: number) => {
    try {
      const response = await fetch(`/api/admin/funds/${transactionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] }),
          queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'pending-transactions'] }),
        ]);
        showToast('Transaction cancelled successfully!', 'success');
        setCancelConfirmDialog({
          open: false,
          transactionId: 0,
          transaction: null,
        });
      } else {
        showToast(result.error || 'Failed to cancel transaction', 'error');
      }
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      showToast('Error cancelling transaction', 'error');
    }
  }, [pendingTransactions, queryClient, showToast]);

  const handleTransactionUpdate = useCallback((transactionId: number) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'pending-transactions'] });
  }, [queryClient]);

  const handleRefreshTransactions = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'latest-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'pending-transactions'] });
    showToast('Transactions refreshed successfully!', 'success');
  };

  const formatDashboardCurrency = useCallback((amount: number) => {
    const formatNumber = (num: number) => {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    if (!currentCurrencyData || !availableCurrencies || availableCurrencies.length === 0) {
      return `$${formatNumber(amount)}`;
    }

    let convertedAmount = amount;
    if (currency !== 'USD') {
      convertedAmount = amount * Number(currentCurrencyData.rate);
    }

    const symbol = currentCurrencyData.symbol || '$';
    
    return `${symbol}${formatNumber(convertedAmount)}`;
  }, [currency, currentCurrencyData, availableCurrencies]);

  if (false) {
    return (
      <div className="px-4 sm:px-8 py-4 sm:py-8 bg-[var(--page-bg)] dark:bg-[var(--page-bg)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="page-content">
      <Announcements />
      <div className="toast-container">
        {customToast && (
          <Toast
            message={customToast.message}
            type={customToast.type}
            onClose={() => setCustomToast(null)}
          />
        )}
      </div>
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="card card-padding">
            <div className="card-content">
              <div className="card-icon">
                <FaUsers />
              </div>
              <div className="flex-1">
                <h3 className="card-title">Total Users</h3>
                {statsLoading ? (
                  <div className="h-8 w-16 gradient-shimmer rounded" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.totalUsers || 0}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card card-padding">
            <div className="card-content">
              <div className="card-icon">
                <FaDollarSign />
              </div>
              <div className="flex-1">
                <h3 className="card-title">Total Balance</h3>
                {statsLoading ? (
                  <div className="h-8 w-20 gradient-shimmer rounded" />
                ) : (
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatDashboardCurrency(stats.totalRevenue || 0)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card card-padding">
            <div className="card-content">
              <div className="card-icon">
                <FaShoppingCart />
              </div>
              <div className="flex-1">
                <h3 className="card-title">Total Orders</h3>
                {statsLoading ? (
                  <div className="h-8 w-16 gradient-shimmer rounded" />
                ) : (
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.totalOrders || 0}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card card-padding">
            <div className="card-content">
              <div className="card-icon">
                <FaBullseye />
              </div>
              <div className="flex-1">
                <h3 className="card-title">Total Payments</h3>
                {statsLoading ? (
                  <div className="h-8 w-20 gradient-shimmer rounded" />
                ) : (
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatDashboardCurrency(stats.totalPayments || 0)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card card-padding">
            <div className="card-content">
              <div className="card-icon">
                <FaChartLine />
              </div>
              <div className="flex-1">
                <h3 className="card-title">Last 30 Days</h3>
                {statsLoading ? (
                  <div className="h-8 w-20 gradient-shimmer rounded" />
                ) : (
                  <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                    {formatDashboardCurrency(stats.last30DaysRevenue || 0)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card card-padding">
            <div className="card-content">
              <div className="card-icon">
                <FaAward />
              </div>
              <div className="flex-1">
                <h3 className="card-title">Today Profit</h3>
                {statsLoading ? (
                  <div className="h-8 w-20 gradient-shimmer rounded" />
                ) : (
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {formatDashboardCurrency(stats.todaysProfit || 0)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card card-padding">
            <div className="card-content">
              <div className="card-icon">
                <FaShoppingCart />
              </div>
              <div className="flex-1">
                <h3 className="card-title">Today's Orders</h3>
                {statsLoading ? (
                  <div className="h-8 w-16 gradient-shimmer rounded" />
                ) : (
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {stats.todaysOrders || 0}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="card card-padding">
            <div className="card-content">
              <div className="card-icon">
                <FaUserPlus />
              </div>
              <div className="flex-1">
                <h3 className="card-title">New Users Today</h3>
                {statsLoading ? (
                  <div className="h-8 w-16 gradient-shimmer rounded" />
                ) : (
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {stats.newUsersToday || 0}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {!isModerator && (
        <div className="mb-6">
          <div className="card card-padding">
            <div className="card-header mb-4">
              <div className="card-icon">
                <FaCog />
              </div>
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/admin/transactions"
                className={`btn btn-primary w-full flex items-center justify-center gap-2`}
              >
                <FaDollarSign className="w-4 h-4" />
                Manage Transactions
              </Link>
              <Link
                href="/admin/users"
                className={`btn btn-secondary w-full flex items-center justify-center gap-2`}
              >
                <FaUsers className="w-4 h-4" />
                Manage Users
              </Link>
              <Link
                href="/admin/orders"
                className={`btn btn-secondary w-full flex items-center justify-center gap-2`}
              >
                <FaShoppingCart className="w-4 h-4" />
                Manage Orders
              </Link>
              <Link
                href="/admin/services"
                className={`btn btn-secondary w-full flex items-center justify-center gap-2`}
              >
                <FaCog className="w-4 h-4" />
                Manage Services
              </Link>
            </div>
          </div>
        </div>
      )}
      {hasTransactionsPermission && (
        <div className="mb-6">
          <div className="card">
            <div className="card-header px-4 pt-4 lg:px-6 lg:pt-6" style={{ paddingBottom: 0 }}>
              <div className="flex items-center gap-2 lg:justify-between lg:w-full">
                <div className="flex items-center gap-2 lg:flex-1">
                  <div className="card-icon">
                    <FaClock />
                  </div>
                  <h3 className="card-title">Pending Transactions</h3>
                </div>
                <div className="hidden lg:block">
                  <Link
                    href="/admin/transactions"
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <FaEye className="w-4 h-4" />
                    View More
                  </Link>
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 lg:px-6 lg:pb-6 min-h-[300px] flex flex-col lg:block">
              {transactionsLoading ? (
                <TransactionsTableSkeleton />
              ) : pendingTransactions.length === 0 ? (
                <div className="text-center py-12 flex-1 flex flex-col justify-center items-center lg:flex-none lg:block lg:py-12">
                  <FaCheckCircle
                    className="h-16 w-16 mx-auto mb-4"
                    style={{ color: 'var(--text-muted)', opacity: 0.5 }}
                  />
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    No pending transactions
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    All transactions are up to date
                  </p>
                </div>
              ) : (
                <TransactionsTable
                  transactions={pendingTransactions.slice(0, 3) as any}
                  formatID={formatID}
                  displayMethod={displayMethod}
                  getStatusBadge={getStatusBadge}
                  handleApprove={handleApprove}
                  handleCancel={handleCancel}
                  openViewDetailsDialog={openViewDetailsDialog}
                  openUpdateStatusDialog={openUpdateStatusDialog}
                  formatTime={formatTime}
                  formatDate={formatDate}
                />
              )}
            </div>
            <div className="px-4 pb-4 lg:px-6 lg:pb-6 lg:hidden">
              <Link
                href="/admin/transactions"
                className="btn btn-secondary flex items-center justify-center gap-2 w-full"
              >
                <FaEye className="w-4 h-4" />
                View More
              </Link>
            </div>
          </div>
        </div>
      )}

      <ApproveTransactionModal
        open={approveConfirmDialog.open}
        transaction={approveConfirmDialog.transaction ? {
          ...approveConfirmDialog.transaction,
          currency: approveConfirmDialog.transaction.currency || 'USD',
          transaction_id: approveConfirmDialog.transaction.transaction_id,
          transactionId: approveConfirmDialog.transaction.transaction_id,
        } : null}
        transactionId={approveConfirmDialog.transactionId}
        approveTransactionId={approveTransactionId}
        defaultTransactionId={defaultTransactionId}
        onClose={() => {
          setApproveConfirmDialog({
            open: false,
            transactionId: 0,
            transaction: null,
          });
          setApproveTransactionId('');
        }}
        onApprove={confirmApprove}
        formatTransactionCurrency={formatTransactionCurrency}
        displayMethod={displayMethod}
      />

      <CancelTransactionModal
        open={cancelConfirmDialog.open}
        transaction={cancelConfirmDialog.transaction ? {
          ...cancelConfirmDialog.transaction,
          currency: cancelConfirmDialog.transaction.currency || 'USD',
          transaction_id: cancelConfirmDialog.transaction.transaction_id,
          transactionId: cancelConfirmDialog.transaction.transaction_id,
        } : null}
        transactionId={cancelConfirmDialog.transactionId}
        onClose={() => {
          setCancelConfirmDialog({
            open: false,
            transactionId: 0,
            transaction: null,
          });
        }}
        onCancel={confirmCancel}
        formatTransactionCurrency={formatTransactionCurrency}
        displayMethod={displayMethod}
      />
    </div>
  );
}
