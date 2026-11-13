
'use client';

import { useCurrency } from '@/contexts/currency-context';
import { useGetCategories } from '@/hooks/categories-fetch';
import { useCurrentUser } from '@/hooks/use-current-user';
import axiosInstance from '@/lib/axios-instance';
import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import {
    dashboardApi,
    useGetUserStatsQuery,
} from '@/lib/services/dashboard-api';
import { userOrderApi } from '@/lib/services/user-order-api';
import { ServiceTypeFields } from '@/components/service-type-fields';
import { validateOrderByType, getServiceTypeConfig, ServiceTypeConfig } from '@/lib/service-types';
import { PriceDisplay } from '@/components/price-display';
import { convertCurrency, formatCurrencyAmount } from '@/lib/currency-utils';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
    FaBuffer,
    FaCheck,
    FaCheckCircle,
    FaClock,
    FaDiscord,
    FaFacebook,
    FaFilter,
    FaGlobe,
    FaInfoCircle,
    FaInstagram,
    FaLayerGroup,
    FaLink,
    FaLinkedin,
    FaRedo,
    FaSearch,
    FaShieldAlt,
    FaShoppingCart,
    FaSpotify,
    FaTachometerAlt,
    FaTelegram,
    FaTiktok,
    FaTimes,
    FaTwitter,
    FaYoutube
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { useNewOrderForm, setNewOrderPlatform } from '@/components/new-order/use-new-order-form';
import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonNewOrder from '@/components/themes/carbon/new-order';

const toNumber = (value: number | bigint | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? 0 : num;
};

const toString = (value: number | bigint | string | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  if (typeof value === 'bigint') return value.toString();
  return String(value);
};

const Toast = ({
  message,
  type = 'success',
  onClose,
}: {
  message: string | { message?: string } | unknown;
  type?: 'success' | 'error' | 'info' | 'pending';
  onClose: () => void;
}) => {
  const displayMessage = typeof message === 'string' 
    ? message 
    : (typeof message === 'object' && message !== null && 'message' in message && typeof message.message === 'string'
      ? message.message
      : JSON.stringify(message) || 'An error occurred');
  
  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg backdrop-blur-sm border ${
        type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : type === 'error'
          ? 'bg-red-50 border-red-200 text-red-800'
          : type === 'info'
          ? 'bg-blue-50 border-blue-200 text-blue-800'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }`}
    >
      <div className="flex items-center space-x-2">
        {type === 'success' && <FaCheckCircle className="w-4 h-4" />}
        <span className="font-medium">{displayMessage}</span>
        <button onClick={onClose} className="ml-2 p-1 hover:bg-black/10 rounded">
          <FaTimes className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const ServiceDetailsCard = ({
  selectedService,
  services,
  servicesData,
  isLoading = false,
  effectiveRate,
}: {
  selectedService: string;
  services: any[];
  servicesData?: any[];
  isLoading?: boolean;
  effectiveRate?: number;
}) => {
  const selected = services?.find((s) => s.id === parseInt(selectedService) || s.id === selectedService) 
    || servicesData?.find((s) => s.id === parseInt(selectedService) || s.id === selectedService);
  const displayRate = effectiveRate ?? selected?.rate ?? 0;

  if (isLoading) {
    return (
      <div className="card card-padding">
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
            color: 'white',
            padding: '24px',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-16 gradient-shimmer rounded-full" />
          </div>
          <div className="h-6 w-64 gradient-shimmer rounded mb-2" />
          <div className="h-4 w-full gradient-shimmer rounded" />
        </div>
        <div className="card card-padding">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx}>
                <div className="h-4 w-24 gradient-shimmer rounded mb-2" />
                <div className="flex items-center">
                  <div className="h-8 w-8 gradient-shimmer rounded-full mr-3" />
                  <div className="h-4 w-20 gradient-shimmer rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <div className="h-4 w-32 gradient-shimmer rounded mb-2" />
            <div className="h-24 w-full gradient-shimmer rounded-lg" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="h-6 w-12 gradient-shimmer rounded mx-auto mb-2" />
              <div className="h-3 w-16 gradient-shimmer rounded mx-auto" />
            </div>
            <div className="text-center">
              <div className="h-6 w-12 gradient-shimmer rounded mx-auto mb-2" />
              <div className="h-3 w-16 gradient-shimmer rounded mx-auto" />
            </div>
            <div className="text-center">
              <div className="h-6 w-16 gradient-shimmer rounded mx-auto mb-2" />
              <div className="h-3 w-20 gradient-shimmer rounded mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="card card-padding">
        <div className="text-center py-8">
          <FaInfoCircle className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-500">Select a service to view details</p>
        </div>
      </div>
    );
  }

  function decodeHTML(html: string) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  return (
    <div className="space-y-6">
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
          color: 'white',
          padding: '24px',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
            {selected.id}
          </div>
        </div>
        <h3 className="text-lg font-bold leading-tight">{selected.name}</h3>
        <div className="text-sm opacity-90 mt-2">
          Max {toString(selected.max_order) || 'N/A'} ~ NO REFILL ~{' '}
          {selected.avg_time || 'N/A'} ~ INSTANT - <PriceDisplay amount={displayRate} originalCurrency="USD" />{' '}
          per 1000
        </div>
      </div>
      <div className="card card-padding">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Example Link</h4>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                selected.exampleLink ? 'bg-blue-100' : 'bg-red-100'
              }`}>
                <FaLink className={`text-sm ${
                  selected.exampleLink ? 'text-blue-600' : 'text-red-600'
                }`} />
              </div>
              {selected.exampleLink ? (
                <a
                  href={selected.exampleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline truncate max-w-48"
                  title={selected.exampleLink}
                >
                  {selected.exampleLink}
                </a>
              ) : (
                <span className="text-sm dark:text-gray-300">-</span>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Speed</h4>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                !selected.serviceSpeed ? 'bg-gray-100' :
                selected.serviceSpeed === 'slow' ? 'bg-red-100' :
                selected.serviceSpeed === 'sometimes_slow' ? 'bg-orange-100' :
                selected.serviceSpeed === 'normal' || selected.serviceSpeed === 'medium' ? 'bg-yellow-100' :
                selected.serviceSpeed === 'fast' ? 'bg-green-100' :
                'bg-gray-100'
              }`}>
                <FaTachometerAlt className={`text-sm ${
                  !selected.serviceSpeed ? 'text-gray-600 dark:text-gray-400' :
                  selected.serviceSpeed === 'slow' ? 'text-red-600 dark:text-red-400' :
                  selected.serviceSpeed === 'sometimes_slow' ? 'text-orange-600 dark:text-orange-400' :
                  selected.serviceSpeed === 'normal' || selected.serviceSpeed === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                  selected.serviceSpeed === 'fast' ? 'text-green-600 dark:text-green-400' :
                  'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <span className={`text-sm font-medium ${
                !selected.serviceSpeed ? 'text-gray-600 dark:text-gray-400' :
                selected.serviceSpeed === 'slow' ? 'text-red-600 dark:text-red-400' :
                selected.serviceSpeed === 'sometimes_slow' ? 'text-orange-600 dark:text-orange-400' :
                selected.serviceSpeed === 'normal' || selected.serviceSpeed === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                selected.serviceSpeed === 'fast' ? 'text-green-600 dark:text-green-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {(() => {
                  if (!selected.serviceSpeed) return '-';

                  const speedMapping: { [key: string]: string } = {
                    'slow': 'Slow',
                    'sometimes_slow': 'Sometimes Slow',
                    'normal': 'Normal',
                    'medium': 'Normal',
                    'fast': 'Fast'
                  };

                  return speedMapping[selected.serviceSpeed] || '-';
                })()}
              </span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Start Time</h4>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <FaClock className="text-blue-600 text-sm" />
              </div>
              <span className="text-sm dark:text-gray-300">Instant</span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Refill</h4>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                selected.refill ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <FaRedo className={`text-sm ${
                  selected.refill ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
              <span className={`text-sm font-medium ${
                selected.refill ? 'text-green-600' : 'text-red-600'
              }`}>
                {selected.refill ? 'Available' : 'Not Available'}
              </span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Cancel</h4>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                selected.cancel ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <FaTimes className={`text-sm ${
                  selected.cancel ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
              <span className={`text-sm font-medium ${
                selected.cancel ? 'text-green-600' : 'text-red-600'
              }`}>
                {selected.cancel ? 'Available' : 'Not Available'}
              </span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Average Time</h4>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <FaClock className="text-blue-600 text-sm" />
              </div>
              <span className="text-sm dark:text-gray-300">
                {selected.avg_time || 'Not enough data'}
              </span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Guarantee</h4>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                selected.refill ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <FaShieldAlt className={`text-sm ${
                  selected.refill ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
              {selected.refill ? (
                <span className="text-sm text-green-600 flex items-center">
                  <FaCheck className="text-green-600 text-xs mr-1" />
                  {selected.refillDays === null || selected.refillDays === undefined || selected.refillDays === 0 ? (
                    'Lifetime'
                  ) : (
                    <>
                      {selected.refillDays} {selected.refillDays === 1 ? 'day' : 'days'}
                      {selected.refillDisplay && selected.refillDisplay > 0 && (
                        <span className="ml-1">({selected.refillDisplay} {selected.refillDisplay === 1 ? 'hour' : 'hours'})</span>
                      )}
                    </>
                  )}
                </span>
              ) : (
                <span className="text-sm text-red-600">
                  <FaTimes className="text-red-600 text-xs" />
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">More Details</h4>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div
              className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: decodeHTML(
                  selected.description || 'No additional details available.'
                ),
              }}
            />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {toString(selected.min_order) || '0'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Min Order</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {toString(selected.max_order) || '0'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Max Order</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              <PriceDisplay amount={displayRate} originalCurrency="USD" />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Per 1000</div>
          </div>
        </div>
      </div>
    </div>
  );
};

function NewOrder() {
  const {
    user,
    router,
    searchParams,
    dispatch,
    userStatsResponse,
    refetchUserStats,
    serviceIdFromUrl,
    categoryIdFromUrl,
    platformFromUrl,
    servicesData,
    setServicesData,
    search,
    setSearch,
    showDropdown,
    setShowDropdown,
    isSearchLoading,
    setIsSearchLoading,
    searchRef,
    toastMessage,
    setToastMessage,
    massOrderEnabled,
    setMassOrderEnabled,
    category,
    categoryError,
    categoryLoading,
    selectedCategory,
    setSelectedCategory,
    qty,
    setQty,
    link,
    setLink,
    services,
    setServices,
    selectedService,
    setSelectedService,
    favoriteCategories,
    setFavoriteCategories,
    combinedCategories,
    setCombinedCategories,
    categoriesWithServices,
    setCategoriesWithServices,
    isSubmitting,
    setIsSubmitting,
    isFormLoading,
    setIsFormLoading,
    isServiceDetailsLoading,
    setIsServiceDetailsLoading,
    serviceTypeFields,
    setServiceTypeFields,
    serviceTypeErrors,
    setServiceTypeErrors,
    showToast,
    handleServiceTypeFieldChange,
    resetServiceTypeFields,
    selected,
    perQty,
    serviceRate,
    servicesDiscount,
    price,
    currency,
    availableCurrencies,
    currentCurrencyData,
    currencySettings,
    totalPrice,
    baseUsdPrice,
    fetchServiceById,
    getServices,
    decodeHTML,
    userData,
    onSubmit,
    handleSearchSelect,
  } = useNewOrderForm();

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <div className="w-full space-y-4 lg:space-y-6">
            {massOrderEnabled && (
              <div className="card" style={{ padding: '8px' }}>
                <div className="flex space-x-2">
                  <button className="flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white shadow-lg">
                    <FaShoppingCart className="mr-2 w-4 h-4" />
                    New Order
                  </button>
                  <button
                    onClick={() => router.push('/mass-orders')}
                    className="flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 dark:hover:from-gray-800 dark:hover:to-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    <FaLayerGroup className="mr-2 w-4 h-4" />
                    Mass Orders
                  </button>
                </div>
              </div>
            )}

            {platformFromUrl && platformFromUrl !== 'Everything' && (
              <div className="flex items-center space-x-3 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
                <FaFilter className="h-4 w-4 flex-shrink-0 text-purple-600" />
                <div>
                  <span>
                    Showing{' '}
                    <strong>
                      {platformFromUrl.replace('Traffic', ' Traffic')} services
                    </strong>{' '}
                    only
                  </span>
                  <span className="ml-2 text-purple-500">
                    ({categoriesWithServices.length} categor
                    {categoriesWithServices.length === 1 ? 'y' : 'ies'}{' '}
                    available)
                  </span>
                </div>
              </div>
            )}

            <div className="card card-padding w-full max-w-full">
              {isFormLoading ? (
                <div className="space-y-4 w-full max-w-full">
                  <div className="form-group w-full">
                    <div className="form-label">
                      <span className="inline-block h-4 w-32 gradient-shimmer rounded" />
                    </div>
                    <div className="relative w-full">
                      <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="form-label">
                      <span className="inline-block h-4 w-24 gradient-shimmer rounded" />
                    </div>
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="form-label">
                      <span className="inline-block h-4 w-20 gradient-shimmer rounded" />
                    </div>
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="form-label">
                      <span className="inline-block h-4 w-16 gradient-shimmer rounded" />
                    </div>
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="form-label">
                      <span className="inline-block h-4 w-24 gradient-shimmer rounded" />
                    </div>
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                    <div className="h-3 w-32 gradient-shimmer rounded mt-1" />
                  </div>
                  <div className="form-group">
                    <div className="form-label">
                      <span className="inline-block h-4 w-20 gradient-shimmer rounded" />
                    </div>
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="h-10 w-full gradient-shimmer rounded-lg" />
                </div>
              ) : (
                <form
                  onSubmit={onSubmit}
                  className="space-y-4 w-full max-w-full"
                >
                  <div className="form-group w-full">
                    <label className="form-label">Search Services</label>
                    <div className="relative w-full" ref={searchRef}>
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                        <FaSearch className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      </div>
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className="form-field w-full pl-10 pr-4 py-3 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                        placeholder="Search services..."
                        autoComplete="off"
                        style={{ width: '100%', minWidth: '0' }}
                      />
                      {showDropdown && (
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto left-0 right-0">
                          {isSearchLoading && (
                            <div className="p-3 text-sm text-gray-500 dark:text-gray-400">Searching...</div>
                          )}
                          {!isSearchLoading && servicesData.length === 0 && search.trim().length > 0 && (
                            <div className="p-3 text-sm text-gray-500 dark:text-gray-400">No services found</div>
                          )}
                          {!isSearchLoading && servicesData.length > 0 && (
                            <>
                              {servicesData.map((service) => (
                                <div
                                  key={service.id}
                                  className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                  onClick={() =>
                                    handleSearchSelect(
                                      service.id,
                                      service.categoryId
                                    )
                                  }
                                >
                                  <div className="flex justify-between items-center w-full">
                                    <span className="text-sm text-gray-900 dark:text-gray-100 truncate pr-2 flex-1">
                                      {service.name}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                      <PriceDisplay amount={service.rate || 0} originalCurrency="USD" />
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="category">
                      Category
                    </label>
                    <select
                      id="category"
                      className="form-field w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer"
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedService('');
                      }}
                    >
                      <option value="" disabled>
                        Select a category
                      </option>

                      {categoriesWithServices.some((cat) => cat.isFavorite) && (
                        <optgroup label="Favorites">
                          {categoriesWithServices
                            .filter((cat) => cat.isFavorite)
                            .map((favCat) => (
                              <option
                                key={`fav-${favCat.id}`}
                                value={String(favCat.id)}
                              >
                                {favCat.category_name}
                              </option>
                            ))}
                        </optgroup>
                      )}

                      <optgroup label="All Categories">
                        {categoriesWithServices
                          .filter((cat) => !cat.isFavorite)
                          .map((cat: any) => (
                            <option key={`reg-${cat.id}`} value={String(cat.id)}>
                              {cat.category_name}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="services">
                      Services
                    </label>
                    <select
                      id="services"
                      className="form-field w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer"
                      value={selectedService}
                      onChange={(e) => {
                        setSelectedService(e.target.value);
                        resetServiceTypeFields();
                      }}
                      disabled={!selectedCategory || services.length === 0}
                      required
                    >
                      <option value="" disabled>
                        {services.length === 0 ? 'No services available' : 'Select a service'}
                      </option>
                      {services?.map((service: any) => {
                        const rawRate = Number(service.rate) || 0;
                        const servicePrice = servicesDiscount <= 0 ? rawRate : rawRate * (1 - servicesDiscount / 100);
                        const formattedPrice = currentCurrencyData && currencySettings && availableCurrencies
                          ? formatCurrencyAmount(
                              convertCurrency(servicePrice, 'USD', currency, availableCurrencies),
                              currency,
                              availableCurrencies,
                              currencySettings
                            )
                          : `$${servicePrice.toFixed(2)}`;
                        return (
                          <option key={service.id} value={String(service.id)}>
                            {service.name} - {formattedPrice}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="link">
                      {selected?.orderLink === 'username' ? 'Username' : 'Link'}
                    </label>
                    <input
                      type={selected?.orderLink === 'username' ? 'text' : 'url'}
                      id="link"
                      className="form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                      placeholder={
                        selected?.orderLink === 'username' 
                          ? 'Enter username' 
                          : 'https://example.com'
                      }
                      required
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      pattern={selected?.orderLink === 'username' ? undefined : "https?://.+"}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="qty">
                      Quantity
                    </label>
                    <input
                      type="number"
                      id="qty"
                      className="form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter Quantity"
                      onChange={(e) =>
                        e.target.value
                          ? setQty(parseInt(e.target.value))
                          : setQty(0)
                      }
                      min={
                        toNumber(services?.find((s) => s.id === parseInt(selectedService) || s.id === selectedService)
                          ?.min_order) || 0
                      }
                      max={
                        toNumber(services?.find((s) => s.id === parseInt(selectedService) || s.id === selectedService)
                          ?.max_order) || 0
                      }
                      value={qty || ''}
                    />
                    <small className="text-xs text-gray-500 mt-1">
                      Min:{' '}
                      {toString(services?.find((s) => s.id === parseInt(selectedService) || s.id === selectedService)
                        ?.min_order) || '0'}{' '}
                      - Max:{' '}
                      {toString(services?.find((s) => s.id === parseInt(selectedService) || s.id === selectedService)
                        ?.max_order) || '0'}
                    </small>
                    {qty > 0 && qty < toNumber(selected?.min_order) && (
                      <div className="text-red-500 text-xs mt-1">
                        Quantity must be at least {toString(selected?.min_order) || '0'}
                      </div>
                    )}
                    {qty > toNumber(selected?.max_order || 999999) && (
                      <div className="text-red-500 text-xs mt-1">
                        Quantity cannot exceed {toString(selected?.max_order) || '0'}
                      </div>
                    )}
                  </div>
                  {selectedService && selected?.type && (
                    <ServiceTypeFields
                      serviceType={selected.type as number}
                      values={serviceTypeFields}
                      onChange={handleServiceTypeFieldChange}
                      errors={serviceTypeErrors}
                    />
                  )}
                  <div className="form-group">
                    <label className="form-label" htmlFor="price">
                      Charge (per 1000 = <PriceDisplay amount={price} originalCurrency="USD" />)
                    </label>
                    <input
                      type="text"
                      id="price"
                      readOnly
                      disabled
                      className="form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={
                        currentCurrencyData && currencySettings && availableCurrencies
                          ? formatCurrencyAmount(
                              convertCurrency(baseUsdPrice, 'USD', currency, availableCurrencies),
                              currency,
                              availableCurrencies,
                              currencySettings
                            )
                          : currency === 'USD'
                          ? `$ ${totalPrice.toFixed(4)}`
                          : currency === 'BDT'
                          ? `৳ ${totalPrice.toFixed(2)}`
                          : `${currentCurrencyData?.symbol || '$'}${totalPrice.toFixed(2)}`
                      }
                      placeholder="Charge"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !selectedService ||
                      !link ||
                      qty < 1 ||
                      qty < toNumber(selected?.min_order) ||
                      qty > toNumber(selected?.max_order || 999999)
                    }
                    className="btn btn-primary w-full"
                  >
                    {isSubmitting ? (
                      <>
                        Creating Order...
                      </>
                    ) : qty > 0 && qty < toNumber(selected?.min_order) ? (
                      `Minimum ${toString(selected?.min_order) || '0'} required`
                    ) : qty > toNumber(selected?.max_order || 999999) ? (
                      `Maximum ${toString(selected?.max_order) || '0'} allowed`
                    ) : !selectedService ? (
                      'Select a service first'
                    ) : !link ? (
                      selected?.orderLink === 'username' ? 'Enter username' : 'Enter link'
                    ) : qty < 1 ? (
                      'Enter quantity'
                    ) : (
                      'Create Order'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <ServiceDetailsCard
              selectedService={selectedService}
              services={services}
              servicesData={servicesData}
              isLoading={isServiceDetailsLoading}
              effectiveRate={selectedService ? price : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewOrderPage() {
  const { appName } = useAppNameWithFallback();
  const userTheme = useUserTheme();

  const router = useRouter();

  useEffect(() => {
    setPageTitle('New Order', appName);
  }, [appName]);

  if (userTheme === 'carbon') return <CarbonNewOrder />;

  const platforms = [
    {
      name: 'Everything',
      icon: <FaBuffer size={24} />,
      color: 'bg-gradient-to-r from-purple-700 to-purple-500',
      solidColor: 'bg-purple-600',
      categoryKeyword: null,
    },
    {
      name: 'Instagram',
      icon: <FaInstagram size={24} />,
      color: 'bg-gradient-to-r from-pink-600 to-pink-400',
      solidColor: 'bg-pink-500',
      categoryKeyword: 'Instagram',
    },
    {
      name: 'Facebook',
      icon: <FaFacebook size={24} />,
      color: 'bg-gradient-to-r from-blue-600 to-blue-400',
      solidColor: 'bg-blue-500',
      categoryKeyword: 'Facebook',
    },
    {
      name: 'YouTube',
      icon: <FaYoutube size={24} />,
      color: 'bg-gradient-to-r from-red-600 to-red-400',
      solidColor: 'bg-red-500',
      categoryKeyword: 'YouTube',
    },
    {
      name: 'TikTok',
      icon: <FaTiktok size={24} />,
      color: 'bg-gradient-to-r from-gray-800 to-gray-600',
      solidColor: 'bg-gray-700',
      categoryKeyword: 'TikTok',
    },
    {
      name: 'Twitter',
      icon: <FaTwitter size={24} />,
      color: 'bg-gradient-to-r from-blue-400 to-blue-300',
      solidColor: 'bg-blue-400',
      categoryKeyword: 'Twitter',
    },
    {
      name: 'Telegram',
      icon: <FaTelegram size={24} />,
      color: 'bg-gradient-to-r from-blue-500 to-blue-300',
      solidColor: 'bg-blue-400',
      categoryKeyword: 'Telegram',
    },
    {
      name: 'Spotify',
      icon: <FaSpotify size={24} />,
      color: 'bg-gradient-to-r from-green-600 to-green-400',
      solidColor: 'bg-green-500',
      categoryKeyword: 'Spotify',
    },
    {
      name: 'LinkedIn',
      icon: <FaLinkedin size={24} />,
      color: 'bg-gradient-to-r from-blue-800 to-blue-600',
      solidColor: 'bg-blue-700',
      categoryKeyword: 'LinkedIn',
    },
    {
      name: 'Discord',
      icon: <FaDiscord size={24} />,
      color: 'bg-gradient-to-r from-indigo-600 to-indigo-400',
      solidColor: 'bg-indigo-500',
      categoryKeyword: 'Discord',
    },
    {
      name: 'Website Traffic',
      icon: <FaGlobe size={24} />,
      color: 'bg-gradient-to-r from-purple-500 to-purple-300',
      solidColor: 'bg-purple-400',
      categoryKeyword: 'Website',
    },
    {
      name: 'Others',
      icon: <FaBuffer size={24} />,
      color: 'bg-gradient-to-r from-gray-700 to-gray-500',
      solidColor: 'bg-gray-600',
      categoryKeyword: 'Others',
    },
  ];

  const handleCategoryClick = (categoryKeyword: string | null) => {
    setNewOrderPlatform(categoryKeyword);
  };

  return (
    <div className="h-full">
      <div className="flex flex-col">
        <div className="card card-padding mb-6">
          <div className="card-header mb-4">
            <div className="card-icon">
              <FaBuffer className="w-5 h-5" />
            </div>
            <h3 className="card-title">Select Platform</h3>
            <span className="ml-auto bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm font-medium hidden sm:inline-block">
              Choose Your Service
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {platforms.map((platform, index) => {

              const mobileClass = platform.solidColor;
              const desktopClass = platform.color.replace('bg-gradient-to-r', 'sm:bg-gradient-to-r');

              return (
                <button
                     key={platform.name}
                     onClick={() => handleCategoryClick(platform.categoryKeyword)}
                     className={`${mobileClass} ${desktopClass} text-white px-2 py-0 sm:p-4 rounded-lg sm:rounded-xl flex flex-col items-center justify-center h-10 sm:h-24 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 border border-white/20`}
                   >
                   <div className="sm:mb-2 sm:p-2 sm:bg-white/20 sm:rounded-lg sm:backdrop-blur-sm">
                      <div className="scale-75 sm:scale-100">
                        {platform.icon}
                      </div>
                    </div>
                   <div className="text-xs font-semibold text-center leading-tight hidden sm:block">
                     {platform.name}
                   </div>
                 </button>
              );
            })}
          </div>
        </div>

        <NewOrder />
      </div>
    </div>
  );
}
