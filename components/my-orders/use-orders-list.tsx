'use client';

import { useCurrency } from '@/contexts/currency-context';
import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import { useGetUserOrdersQuery } from '@/lib/services/user-order-api';
import { formatID, formatNumber, formatPrice, formatCount } from '@/lib/utils';
import { PriceDisplay } from '@/components/price-display';
import moment from 'moment';
import { useRouter, useSearchParams } from 'next/navigation';
import CancelOrderModal from '@/components/dashboard/my-orders/modals/cancel-order';
import RequestRefillModal from '@/components/dashboard/my-orders/modals/request-refill';
import OrderTable from '@/components/dashboard/my-orders/order-table';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { getUserDetails } from '@/lib/actions/getUser';
import {
  FaBan,
  FaCheck,
  FaCheckCircle,
  FaCircleNotch,
  FaClock,
  FaList,
  FaRss,
  FaSearch,
  FaSpinner,
  FaSync,
  FaTimes
} from 'react-icons/fa';

interface CancelRequest {
  id: number;
  status: string;
  createdAt: string;
}

interface OrderWithCancelRequests {
  id: number;
  status: string;
  cancelRequests?: CancelRequest[];
  service?: {
    cancel?: boolean;
    refill?: boolean;
    name?: string;
  };
  [key: string]: any;
}

// State, data loading and actions for the Orders page. Shared by every user theme.
export function useOrdersList() {
  const { appName } = useAppNameWithFallback();
  const userDetails = useSelector((state: any) => state.userDetails);
  const [timeFormat, setTimeFormat] = useState<string>('24');
  const [userTimezone, setUserTimezone] = useState<string>('Asia/Dhaka');

  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'pending';
  } | null>(null);
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    orderId: number | null;
    reason: string;
    isLoading?: boolean;
  }>({
    isOpen: false,
    orderId: null,
    reason: '',
    isLoading: false
  });

  const [refillModal, setRefillModal] = useState<{
    isOpen: boolean;
    orderId: number | null;
    reason: string;
    isLoading?: boolean;
  }>({
    isOpen: false,
    orderId: null,
    reason: '',
    isLoading: false
  });

  const [localPendingCancelRequests, setLocalPendingCancelRequests] = useState<Set<number>>(new Set());
  const hasSyncedRef = useRef(false);
  const queryInitiatedRef = useRef(false);

  const { currency, availableCurrencies, currentCurrencyData } = useCurrency();

  const { data, isLoading, error, refetch } = useGetUserOrdersQuery({
    page,
    limit,
    status,
    search: debouncedSearch,
  });

  useEffect(() => {
    if (!isLoading && (data !== undefined || error !== undefined)) {
      queryInitiatedRef.current = true;
    }
  }, [isLoading, data, error]);

  useEffect(() => {
    setPageTitle('My Orders', appName);
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

      if ((storedTimeFormat === '12' || storedTimeFormat === '24') && storedTimezone) {
        return;
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

  const formatTime = (dateString: string | Date): string => {
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
  };

  const formatDate = (dateString: string | Date): string => {
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

    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: userTimezone,
    });
  };

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectRealtime = () => {
      try {
        eventSource = new EventSource('/api/user/orders/realtime');

        eventSource.onopen = () => {
          console.log('✅ Real-time sync connected for my-orders');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'order_updated') {
              console.log('Order updated via real-time on my-orders:', data.orderId);

              if (queryInitiatedRef.current) {
                refetch();
              }
            } else if (data.type === 'ping') {
              console.log('Real-time ping received');
            }
          } catch (error) {
            console.error('Error parsing real-time message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('Real-time sync error on my-orders:', error);
          if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            eventSource = null;
            setTimeout(() => {
              if (!eventSource) {
                connectRealtime();
              }
            }, 5000);
          }
        };
      } catch (error) {
        console.error('Error setting up real-time sync on my-orders:', error);
      }
    };

    connectRealtime();

    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [refetch]);

  // While the page is open and some order is still running, re-check the provider every 20 seconds.
  const hasRunningOrder = (data?.data || []).some((order: any) =>
    ['pending', 'processing', 'in_progress'].includes(order?.status)
  );
  useEffect(() => {
    if (!hasRunningOrder) return;
    let busy = false;
    const timer = setInterval(async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        const res = await fetch('/api/user/orders/sync-provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ syncAll: true }),
        });
        const json = await res.json().catch(() => null);
        if (json?.success && (json.data?.synced || 0) > 0) refetch();
      } catch {
        // The next tick tries again.
      } finally {
        busy = false;
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [hasRunningOrder, refetch]);

  useEffect(() => {
    if (hasSyncedRef.current) return;

    if (!queryInitiatedRef.current) {
      return;
    }

    const syncProviderOrders = async () => {
      hasSyncedRef.current = true;
      try {
        const syncPromise = fetch('/api/user/orders/sync-provider', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ syncAll: true }),
        }).then(res => res.json()).catch(err => {
          console.error('Error syncing provider orders on reload:', err);
          return { success: false, error: err.message };
        });

        const syncTimeout = new Promise((resolve) => {
          setTimeout(() => resolve({ success: false, timeout: true }), 30000);
        });

        const syncResult: any = await Promise.race([syncPromise, syncTimeout]);

        if (syncResult.timeout) {
          console.log('Sync is taking longer than expected, refreshing orders...');
        } else if (syncResult.success) {
          const syncedCount = syncResult.data?.synced || 0;
          const totalProcessed = syncResult.data?.processed || 0;
          if (syncedCount > 0) {
            console.log(`Synced ${syncedCount} of ${totalProcessed} provider order(s) on page reload`);
          } else if (totalProcessed > 0) {
            console.log(`Checked ${totalProcessed} provider order(s) - all up to date`);
          } else {
            console.log('No provider orders to sync');
          }
        } else {
          console.warn('Provider sync had issues:', syncResult.error);
        }

        try {
          refetch();
        } catch (refetchError: any) {
          if (!refetchError?.message?.includes('has not been started')) {
            console.error('Error refetching orders:', refetchError);
          }
        }
      } catch (error) {
        console.error('Error syncing provider orders on page reload:', error);
        try {
          refetch();
        } catch (refetchError: any) {
          if (!refetchError?.message?.includes('has not been started')) {
            console.error('Error refetching orders:', refetchError);
          }
        }
      }
    };

    syncProviderOrders();
  }, [refetch, data, error]);

  useEffect(() => {
    const urlStatus = searchParams?.get('status');
    const newStatus = urlStatus ? urlStatus.replace('-', '_') : 'all';
    if (newStatus !== status) {
      setStatus(newStatus);
    }
  }, [searchParams, status]);

  useEffect(() => {
    if (data?.data) {
      const ordersWithDeclinedRequests = data.data.filter((order: any) =>
        order.cancelRequests &&
        order.cancelRequests.length > 0 &&
        order.cancelRequests[0].status === 'declined'
      );

      if (ordersWithDeclinedRequests.length > 0) {
        setLocalPendingCancelRequests(prev => {
          const newSet = new Set(prev);
          ordersWithDeclinedRequests.forEach((order: any) => {
            newSet.delete(order.id);
          });
          return newSet;
        });
      }
    }
  }, [data]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);

    if (search.trim()) {
      setIsSearchLoading(true);
    } else {
      setIsSearchLoading(false);
    }

    return () => clearTimeout(timer);
  }, [search]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'pending' = 'success'
  ) => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleStatusChange = (statusKey: string) => {
    setStatus(statusKey);
    setPage(1);

    const currentParams = searchParams?.toString() || '';
    const params = new URLSearchParams(currentParams);

    if (statusKey === 'all') {
      params.delete('status');
    } else {

      const urlStatus = statusKey.replace('_', '-');
      params.set('status', urlStatus);
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/my-orders';
    router.push(newUrl);
  };

  const orders = useMemo(() => {
    let filteredOrders = data?.data || [];

    if (status !== 'all') {
      filteredOrders = filteredOrders.filter((order: any) => {
        const displayStatus = order.providerStatus === 'forward_failed' && order.status === 'failed' ? 'pending' : order.status;
        return displayStatus === status;
      });
    }

    if (debouncedSearch) {
      filteredOrders = filteredOrders.filter((order: any) =>
        order.id.toString().includes(debouncedSearch) ||
        order.service?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        order.category?.category_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        order.link?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    return filteredOrders;
  }, [data, status, debouncedSearch]);

  const pagination = useMemo(() => {
    return data?.pagination || {
      total: 0,
      page: page,
      limit: limit,
      totalPages: 1
    };
  }, [data, page, limit]);

  const totalPages = pagination.totalPages || 1;

  const handlePrevious = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const handleLimitChange = (newLimit: string) => {
    setLimit(newLimit === 'all' ? 999999 : parseInt(newLimit));
    setPage(1);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();

      try {
        const syncPromise = fetch('/api/user/orders/sync-provider', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ syncAll: true }),
        }).then(res => res.json()).catch(err => {
          console.error('Error syncing provider orders on refresh:', err);
          return { success: false, error: err.message };
        });

        const syncTimeout = new Promise((resolve) => {
          setTimeout(() => resolve({ success: false, timeout: true }), 30000);
        });

        const syncResult: any = await Promise.race([syncPromise, syncTimeout]);

        if (syncResult.timeout) {
          console.log('Sync is taking longer than expected, refreshing orders...');
        } else if (syncResult.success) {
          const syncedCount = syncResult.data?.synced || 0;
          const totalProcessed = syncResult.data?.processed || 0;
          if (syncedCount > 0) {
            console.log(`Synced ${syncedCount} of ${totalProcessed} provider order(s) on refresh`);
          } else if (totalProcessed > 0) {
            console.log(`Checked ${totalProcessed} provider order(s) - all up to date`);
          } else {
            console.log('No provider orders to sync');
          }
        } else {
          console.warn('Provider sync had issues:', syncResult.error);
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        await refetch();
      } catch (syncError) {
        console.error('Error during provider sync:', syncError);
        await refetch();
      }

      showToast('Orders refreshed successfully!', 'success');
    } catch (error) {
      console.error('Error refreshing orders:', error);
      showToast('Error refreshing orders. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefill = (orderId: number) => {
    showToast(`Refill request submitted for order #${formatID(orderId)}`, 'success');
  };

  const handleCancel = (orderId: number) => {
    setCancelModal({
      isOpen: true,
      orderId,
      reason: ''
    });
  };

  const handleCancelConfirm = async () => {
    if (!cancelModal.orderId || !cancelModal.reason.trim()) {
      setToastMessage({
        message: 'Please provide a reason for cancellation',
        type: 'error'
      });
      return;
    }

    setCancelModal(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/user/orders/${cancelModal.orderId}/cancel-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelModal.reason.trim()
        })
      });

      const result = await response.json();

      if (result.success) {

        setLocalPendingCancelRequests(prev => new Set(prev).add(cancelModal.orderId!));

        setToastMessage({
          message: result.data.message || 'Cancel request submitted successfully',
          type: 'success'
        });
        handleCancelClose();
      } else {
        setToastMessage({
          message: result.error || 'Failed to submit cancel request',
          type: 'error'
        });
        setCancelModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error submitting cancel request:', error);
      setToastMessage({
        message: 'Failed to submit cancel request',
        type: 'error'
      });
      setCancelModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelClose = () => {
    setCancelModal({
      isOpen: false,
      orderId: null,
      reason: '',
      isLoading: false
    });
  };

  const handleRefillClose = () => {
    setRefillModal({
      isOpen: false,
      orderId: null,
      reason: '',
      isLoading: false
    });
  };

  const handleRefillConfirm = async () => {
    if (!refillModal.orderId) {
      setToastMessage({
        message: 'Invalid order ID',
        type: 'error'
      });
      return;
    }

    setRefillModal(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/user/refill-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: refillModal.orderId,
          reason: (refillModal.reason || '').trim() || 'Customer requested refill due to drop in count'
        })
      });

      let result;
      try {
        result = await response.json();
        console.log('Refill request response:', { status: response.status, ok: response.ok, result });
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        setToastMessage({
          message: 'Failed to parse server response. Please try again.',
          type: 'error'
        });
        setRefillModal(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (response.ok && result.success) {
        if (result.data?.providerRefillError) {
          setToastMessage({
            message: result.message || `Refill request saved, but provider submission failed: ${result.data.providerRefillError}`,
            type: 'info'
          });
        } else if (result.data?.providerRefillSubmitted) {
          setToastMessage({
            message: result.message || 'Refill request submitted successfully and forwarded to provider',
            type: 'success'
          });
        } else {
          setToastMessage({
            message: result.message || 'Refill request submitted successfully',
            type: 'success'
          });
        }
        handleRefillClose();
        refetch();
      } else {
        const errorMessage = result?.error || result?.message || 'Failed to submit refill request';
        setToastMessage({
          message: errorMessage,
          type: 'error'
        });
        setRefillModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error submitting refill request:', error);
      setToastMessage({
        message: 'Failed to submit refill request. Please try again.',
        type: 'error'
      });
      setRefillModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const getStatusCount = (statusKey: string) => {
    const statusBreakdown = data?.stats?.statusBreakdown || {};

    if (statusKey === 'all') {
      return pagination.total || 0;
    }

    const statusKeyMap: Record<string, string> = {
      'in_progress': 'in_progress',
      'processing': 'processing',
      'pending': 'pending',
      'completed': 'completed',
      'partial': 'partial',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'failed': 'failed',
      'refunded': 'refunded'
    };

    const dbStatusKey = statusKeyMap[statusKey] || statusKey;
    return statusBreakdown[dbStatusKey] || statusBreakdown[statusKey] || 0;
  };

  const statusFilters = [
    {
      key: 'all',
      label: 'All',
      icon: FaList,
      color: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      key: 'pending',
      label: 'Pending',
      icon: FaClock,
      color: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      key: 'in_progress',
      label: 'In progress',
      icon: FaSpinner,
      color: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      key: 'completed',
      label: 'Completed',
      icon: FaCheck,
      color: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      key: 'partial',
      label: 'Partial',
      icon: FaCircleNotch,
      color: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      key: 'processing',
      label: 'Processing',
      icon: FaRss,
      color: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      icon: FaBan,
      color: 'bg-gray-600 hover:bg-gray-700',
    },
  ];

  const formatStatusDisplay = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'failed':
        return 'Failed';
      case 'partial':
        return 'Partial';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800';
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800';
      case 'in_progress':
        return 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800';
      case 'partial':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800';
    }
  };

  return {
    appName,
    userDetails,
    timeFormat,
    setTimeFormat,
    userTimezone,
    setUserTimezone,
    router,
    searchParams,
    page,
    setPage,
    limit,
    setLimit,
    status,
    setStatus,
    search,
    setSearch,
    debouncedSearch,
    setDebouncedSearch,
    isSearchLoading,
    setIsSearchLoading,
    refreshing,
    setRefreshing,
    toastMessage,
    setToastMessage,
    cancelModal,
    setCancelModal,
    refillModal,
    setRefillModal,
    localPendingCancelRequests,
    setLocalPendingCancelRequests,
    hasSyncedRef,
    queryInitiatedRef,
    currency,
    availableCurrencies,
    currentCurrencyData,
    data,
    isLoading,
    error,
    refetch,
    formatTime,
    formatDate,
    showToast,
    handleStatusChange,
    orders,
    pagination,
    totalPages,
    handlePrevious,
    handleNext,
    handleLimitChange,
    handleRefresh,
    handleRefill,
    handleCancel,
    handleCancelConfirm,
    handleCancelClose,
    handleRefillClose,
    handleRefillConfirm,
    getStatusCount,
    statusFilters,
    formatStatusDisplay,
    getStatusBadge,
  };
}
