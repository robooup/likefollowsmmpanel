'use client';

import { useCurrency } from '@/contexts/currency-context';
import { useCurrentUser } from '@/hooks/use-current-user';
import { 
  validateMassOrders, 
  checkSufficientBalance, 
  formatValidationErrors,
  convertToApiFormat,
  ParsedOrder,
  ValidationResult 
} from '@/lib/mass-order-validation';
import axiosInstance from '@/lib/axios-instance';
import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import {
    dashboardApi,
    useGetUserStatsQuery,
} from '@/lib/services/dashboard-api';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
    FaCheckCircle,
    FaExternalLinkAlt,
    FaInfoCircle,
    FaLayerGroup,
    FaShoppingCart,
    FaTimes,
    FaTimesCircle,
} from 'react-icons/fa';
import { formatCurrencyAmount } from '@/lib/currency-utils';
import { PriceDisplay } from '@/components/price-display';
import { useDispatch } from 'react-redux';
import { useMassOrder } from '@/components/mass-orders/use-mass-order';
import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonMassOrder from '@/components/themes/carbon/mass-order';

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
    className={`toast toast-${type}`}
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

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorTheme?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  colorTheme = 'blue',
}) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`text-3xl ${
            colorTheme === 'blue'
              ? 'text-blue-500'
              : colorTheme === 'green'
              ? 'text-green-500'
              : colorTheme === 'orange'
              ? 'text-orange-500'
              : colorTheme === 'purple'
              ? 'text-purple-500'
              : 'text-gray-500'
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const InstructionsPanel: React.FC = () => {
  const getServicesUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/services`;
    }
    return '/services';
  };

  return (
    <div className="card card-padding">
      <div className="card-header">
        <div className="card-icon">
          <FaInfoCircle />
        </div>
        <h3 className="card-title">How Mass Orders works?</h3>
      </div>

      <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
        <p>
          You put the service ID followed by | followed by the link followed by
          | followed by quantity on each line to get the service ID of a service
          please check here:
        </p>

        <a
          href={getServicesUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
        >
          {getServicesUrl()}
          <FaExternalLinkAlt className="ml-2 text-xs" />
        </a>

        <p>
          Let's say you want to use the Mass Orders to add Instagram Followers
          to your 3 accounts: abcd, asdf, qwer
        </p>

        <p>
          From the Services List, the service ID for this service "Instagram
          Followers [100% Real - 30 Days Guarantee- NEW SERVICE" is 3740
        </p>

        <p>
          Let's say you want to add 1000 followers for each account, the output
          will be like this: ID|Link|Quantity or in this example:
        </p>

        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm border shadow-sm">
          <div className="text-green-400 space-y-1">
            <div>3740|abcd|1000</div>
            <div>3740|asdf|1000</div>
            <div>3740|qwer|1000</div>
            <div>3740|eoir|1000</div>
          </div>
        </div>
      </div>
    </div>
  );
};

function DefaultMassOrder() {
  const {
    appName,
    user,
    router,
    dispatch,
    currency,
    currencyRate,
    availableCurrencies,
    currentCurrencyData,
    currencySettings,
    userStatsResponse,
    refetchUserStats,
    userStats,
    activeTab,
    setActiveTab,
    orders,
    setOrders,
    isSubmitting,
    setIsSubmitting,
    isFormLoading,
    setIsFormLoading,
    totalOrders,
    setTotalOrders,
    totalPrice,
    setTotalPrice,
    toastMessage,
    setToastMessage,
    massOrderEnabled,
    setMassOrderEnabled,
    isAccessCheckLoading,
    setIsAccessCheckLoading,
    validationResult,
    setValidationResult,
    isValidating,
    setIsValidating,
    validationErrors,
    setValidationErrors,
    balanceCheck,
    setBalanceCheck,
    validateOrders,
    parseOrders,
    balance,
    totalSpend,
    totalOrdersCount,
    showToast,
    formatCurrency,
    handleNewOrderClick,
    handleSubmit,
  } = useMassOrder();

  if (isAccessCheckLoading || !massOrderEnabled) {
    return null;
  }

  return (
    <div className="page-container">
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="page-content">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="card" style={{ padding: '8px' }}>
              <div className="flex space-x-2">
                <button
                  onClick={handleNewOrderClick}
                  className="flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 dark:hover:from-gray-800 dark:hover:to-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  <FaShoppingCart className="mr-2 w-4 h-4" />
                  New Order
                </button>
                <button
                  onClick={() => setActiveTab('massOrder')}
                  className="flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg"
                >
                  <FaLayerGroup className="mr-2 w-4 h-4" />
                  Mass Orders
                </button>
              </div>
            </div>
            {activeTab === 'massOrder' && (
              <div className="card card-padding">
                {isFormLoading ? (
                  <div className="space-y-4">
                    <div className="card-header">
                      <div className="card-icon">
                        <div className="h-10 w-10 gradient-shimmer rounded-lg" />
                      </div>
                      <div className="h-6 w-40 gradient-shimmer rounded ml-3" />
                    </div>
                    <div className="form-group mb-0">
                      <div className="form-label">
                        <span className="inline-block h-4 w-56 gradient-shimmer rounded" />
                      </div>
                      <div className="relative">
                        <div className="h-[256px] w-full gradient-shimmer rounded-lg" />
                      </div>
                    </div>
                    <div className="h-10 w-full gradient-shimmer rounded-lg" />
                  </div>
                ) : (
                  <>
                    <div className="card-header">
                      <div className="card-icon">
                        <FaLayerGroup />
                      </div>
                      <h3 className="card-title">Bulk Order Entry</h3>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="form-group mb-0">
                        <label className="form-label">
                          Order Format: service_id | link | quantity
                        </label>
                        <div className="relative">
                          <textarea
                            placeholder="3740|https://instagram.com/username|1000"
                            value={orders}
                            onChange={(e) => {
                              setOrders(e.target.value);
                              parseOrders(e.target.value);
                            }}
                            className={`form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 ${
                              validationErrors.length > 0 
                                ? 'border-red-300 dark:border-red-600' 
                                : validationResult && validationResult.validOrders.length > 0
                                ? 'border-green-300 dark:border-green-600'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            style={{ height: '256px' }}
                          />
                          {isValidating && (
                            <div className="absolute top-3 right-3">
                              <div className="h-4 w-4 gradient-shimmer rounded-full" />
                            </div>
                          )}
                        </div>
                        {validationResult && (
                          <div className="mt-2 text-xs">
                            <div className={`flex items-center ${
                              validationResult.validOrders.length > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {validationResult.validOrders.length > 0 ? (
                                <FaCheckCircle className="mr-1 w-3 h-3" />
                              ) : (
                                <FaTimesCircle className="mr-1 w-3 h-3" />
                              )}
                              {validationResult.validOrders.length} valid, {validationResult.invalidOrders.length} invalid
                            </div>
                          </div>
                        )}
                        {validationErrors.length > 0 && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                            {validationErrors.slice(0, 3).map((error, index) => (
                              <div key={index} className="flex items-start">
                                <FaTimesCircle className="mr-1 mt-0.5 w-3 h-3 flex-shrink-0" />
                                <span>{error}</span>
                              </div>
                            ))}
                            {validationErrors.length > 3 && (
                              <div className="mt-1 text-red-500">
                                +{validationErrors.length - 3} more errors
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {validationResult && validationResult.validOrders.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-700">
                                Valid Orders:
                              </span>
                              <span className="font-semibold text-blue-900">
                                {validationResult.validOrders.length}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700">
                                Total Cost:
                              </span>
                              <span className="font-semibold text-blue-900">
                                {formatCurrency(validationResult.totalCostInUserCurrency)}
                              </span>
                            </div>
                          </div>
                          {balanceCheck && (
                            <div className={`mt-2 p-2 rounded text-xs ${
                              balanceCheck.sufficient 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <div className="flex justify-between">
                                <span>Available Balance:</span>
                                <span className="font-semibold">
                                  <PriceDisplay amount={balanceCheck.available} originalCurrency="USD" />
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Required Amount:</span>
                                <span className="font-semibold">
                                  {formatCurrency(balanceCheck.required)}
                                </span>
                              </div>
                              {!balanceCheck.sufficient && (
                                <div className="mt-1 font-semibold">
                                  {balanceCheck.message}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-blue-600 mt-2">
                            Prices calculated in {currentCurrencyData?.code || 'USD'} based on current service rates
                          </div>
                        </div>
                      )}
                      {validationResult && validationResult.validOrders.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Order Details ({validationResult.validOrders.length} orders)
                            </h4>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Service
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Qty
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Price
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {validationResult.validOrders.slice(0, 10).map((order, index) => (
                                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                                      <div className="font-medium">{order.serviceId}</div>
                                      <div className="text-gray-500 dark:text-gray-400 truncate max-w-32">
                                        {order.service?.name || 'Loading...'}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                                      {order.quantity.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-right text-gray-900 dark:text-white">
                                      {formatCurrency(order.priceInUserCurrency || 0)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {validationResult.validOrders.length > 10 && (
                              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
                                +{validationResult.validOrders.length - 10} more orders
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={
                          validationResult?.validOrders.length === 0 || 
                          isSubmitting || 
                          isValidating ||
                          (balanceCheck ? !balanceCheck.sufficient : false)
                        }
                        className="btn btn-primary w-full"
                      >
                        {isSubmitting ? (
                          <>
                            Processing...
                          </>
                        ) : isValidating ? (
                          <>
                            Validating...
                          </>
                        ) : validationResult?.validOrders.length === 0 ? (
                          'Enter valid orders'
                        ) : balanceCheck && !balanceCheck.sufficient ? (
                          'Insufficient Balance'
                        ) : (
                          `Submit ${validationResult?.validOrders.length || 0} Orders`
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="space-y-6">
            <InstructionsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MassOrder() {
  const userTheme = useUserTheme();
  return userTheme === 'carbon' ? <CarbonMassOrder /> : <DefaultMassOrder />;
}
