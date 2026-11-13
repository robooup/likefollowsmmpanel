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
import { useOrdersList } from '@/components/my-orders/use-orders-list';
import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonOrders from '@/components/themes/carbon/orders';

const Toast = ({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error' | 'info' | 'pending';
  onClose: () => void;
}) => (
  <div
    className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg backdrop-blur-sm border ${type === 'success'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
        : type === 'error'
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          : type === 'info'
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
      }`}
  >
    <div className="flex items-center space-x-2">
      {type === 'success' && <FaCheckCircle className="w-4 h-4" />}
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
      >
        <FaTimes className="w-3 h-3" />
      </button>
    </div>
  </div>
);

function OrdersList() {
  const {
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
  } = useOrdersList();

  return (
    <div className="page-container">
      <CancelOrderModal
        isOpen={cancelModal.isOpen}
        onClose={handleCancelClose}
        onConfirm={handleCancelConfirm}
        orderId={cancelModal.orderId}
        reason={cancelModal.reason}
        setReason={(reason) => setCancelModal(prev => ({ ...prev, reason }))}
        isLoading={cancelModal.isLoading || false}
      />
      <RequestRefillModal
        isOpen={refillModal.isOpen}
        onClose={handleRefillClose}
        onConfirm={handleRefillConfirm}
        orderId={refillModal.orderId}
        reason={refillModal.reason}
        setReason={(reason) => setRefillModal(prev => ({ ...prev, reason }))}
        isLoading={refillModal.isLoading}
      />
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="page-content">
        <div className="card card-padding">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4 h-12">
                <div className="relative">
                  <select
                    value={limit === 999999 ? 'all' : limit.toString()}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    className="form-field pl-4 pr-8 py-3 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer text-sm min-w-[160px] h-12"
                  >
                    {pagination.total > 0 && (
                      <>
                        {pagination.total >= 10 && <option value="10">10 per page</option>}
                        {pagination.total >= 25 && <option value="25">25 per page</option>}
                        {pagination.total >= 50 && <option value="50">50 per page</option>}
                        {pagination.total >= 100 && <option value="100">100 per page</option>}
                        {pagination.total >= 200 && <option value="200">200 per page</option>}
                        {pagination.total >= 500 && <option value="500">500 per page</option>}
                        <option value="all">Show All</option>
                      </>
                    )}
                    {pagination.total === 0 && (
                      <option value="10">No orders found</option>
                    )}
                  </select>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || isLoading}
                  className="btn btn-primary flex items-center gap-2 px-3 py-2.5 h-12"
                >
                  <FaSync className={refreshing || isLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
              <div className="flex-1 h-12 items-center">
                <div className="form-group mb-0 w-full">
                  <div className="relative flex items-center h-12">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <FaSearch className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <input
                      type="search"
                      placeholder="Search by ID, Service Name, Category..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="form-field w-full pl-10 pr-10 py-3 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 text-sm h-12"
                      autoComplete="off"
                    />
                    {isSearchLoading && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none z-10">
                        <div className="h-4 w-4 gradient-shimmer rounded-full" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-6">
            <div className="flex flex-wrap gap-3">
              {isLoading ? (
                <>
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <div key={idx} className="h-9 w-24 gradient-shimmer rounded-full" />
                  ))}
                </>
              ) : (
                statusFilters.map((filter) => {
                  const IconComponent = filter.icon;
                  const isActive = status === filter.key;
                  const count = getStatusCount(filter.key);

                  return (
                    <button
                      key={filter.key}
                      onClick={() => handleStatusChange(filter.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white ${isActive
                          ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] shadow-lg'
                          : filter.color
                        }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {filter.label} ({count})
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <OrderTable
            orders={orders}
            isLoading={isLoading}
            error={error}
            formatDate={formatDate}
            formatTime={formatTime}
            getStatusBadge={getStatusBadge}
            formatStatusDisplay={formatStatusDisplay}
            localPendingCancelRequests={localPendingCancelRequests}
            onOpenRefillModal={(orderId) => setRefillModal({
              isOpen: true,
              orderId,
              reason: '',
              isLoading: false
            })}
            onOpenCancelModal={(orderId) => setCancelModal({
              isOpen: true,
              orderId,
              reason: '',
              isLoading: false
            })}
            totalPages={totalPages}
            page={page}
            pagination={pagination}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const userTheme = useUserTheme();
  return userTheme === 'carbon' ? <CarbonOrders /> : <OrdersList />;
}
