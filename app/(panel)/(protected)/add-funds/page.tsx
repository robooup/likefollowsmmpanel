'use client';

import { useCurrency } from '@/contexts/currency-context';
import { formatCurrencyAmount, formatNumberWithSettings } from '@/lib/currency-utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useUserSettings } from '@/hooks/useUserSettings';
import axiosInstance from '@/lib/axios-instance';
import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import {
    addFundDefaultValues,
    addFundSchema,
    AddFundSchema,
} from '@/lib/validators/user/add-fund-validator';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useTransition, useRef, useCallback, useMemo } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import {
    FaCalculator,
    FaCheckCircle,
    FaCreditCard,
    FaExchangeAlt,
    FaShieldAlt,
    FaTimes,
    FaWallet,
} from 'react-icons/fa';
import { useAddFunds } from '@/components/add-funds/use-add-funds';
import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonAddFunds from '@/components/themes/carbon/add-funds';

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
    className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg backdrop-blur-sm border ${
      type === 'success'
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
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded">
        <FaTimes className="w-3 h-3" />
      </button>
    </div>
  </div>
);

function DefaultAddFunds() {
  const {
    user,
    appName,
    isPending,
    startTransition,
    globalCurrency,
    globalRate,
    currencySettings,
    availableCurrencies,
    userSettings,
    toastMessage,
    setToastMessage,
    isLoading,
    setIsLoading,
    amountUSDError,
    setAmountUSDError,
    convertedAmountError,
    setConvertedAmountError,
    isSubmitting,
    setIsSubmitting,
    isSubmittingRef,
    exchangeRate,
    setExchangeRate,
    showToast,
    formatNumber,
    formatAmount,
    validateConvertedAmount,
    activeCurrency,
    setActiveCurrency,
    rate,
    form,
    amountUSDValue,
    amountBDTValue,
    methodValue,
    minAmountUSD,
    maxAmountUSD,
    effectiveUSD,
    hasValidAmount,
    toggleCurrency,
    totalAmount,
    setTotalAmount,
    handleUSDChange,
    handleBDTChange,
    onSubmit,
    handleFormSubmit,
  } = useAddFunds();

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card card-padding">
              <div className="space-y-6">
                <div
                  className="card bg-gradient-to-br from-gray-50 to-gray-100 dark:!bg-gray-800 dark:from-gray-800 dark:to-gray-800"
                  style={{
                    padding: '20px',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between mb-4">
                    <div className="h-5 w-32 gradient-shimmer rounded" />
                    <div className="h-6 w-32 gradient-shimmer rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="form-group">
                      <div className="h-4 w-24 gradient-shimmer rounded mb-2" />
                      <div className="h-10 w-full gradient-shimmer rounded-lg" />
                    </div>
                    <div className="flex justify-center">
                      <div className="h-12 w-40 gradient-shimmer rounded-lg" />
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="h-4 w-32 gradient-shimmer rounded mb-2" />
                    <div className="h-10 w-full gradient-shimmer rounded-lg" />
                  </div>
                </div>
                <div className="form-group">
                  <div className="h-10 w-full gradient-shimmer rounded-lg" />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center mb-2">
                    <div className="h-4 w-24 gradient-shimmer rounded" />
                    <div className="h-8 w-32 gradient-shimmer rounded" />
                  </div>
                  <div className="h-4 w-24 gradient-shimmer rounded" />
                </div>
                <div className="h-14 w-full gradient-shimmer rounded-lg" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="card card-padding">
                <div className="card-header">
                  <div className="card-icon">
                    <FaCreditCard />
                  </div>
                  <h3 className="card-title">Secure Payment</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  SSL encrypted transactions with UddoktaPay
                </p>
              </div>
              <div className="card card-padding">
                <div className="card-header">
                  <div className="card-icon">
                    <FaShieldAlt />
                  </div>
                  <h3 className="card-title">100% Safe</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your financial data is protected
                </p>
              </div>
              <div className="card card-padding">
                <div className="card-header">
                  <div className="card-icon">
                    <FaWallet />
                  </div>
                  <h3 className="card-title">Instant Credit</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Funds added immediately after payment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {toastMessage && (
            <Toast
              message={toastMessage.message}
              type={toastMessage.type}
              onClose={() => setToastMessage(null)}
            />
          )}
          <div className="card card-padding">
            <div className="space-y-6">
              <div
                className="card bg-gradient-to-br from-gray-50 to-gray-100 dark:!bg-gray-800 dark:from-gray-800 dark:to-gray-800"
                style={{
                  padding: '20px',
                }}
              >
                <div className="flex flex-wrap items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    <FaCalculator className="inline mr-2" />
                    Amount Details
                  </h4>
                  <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 mt-2 sm:mt-0 mx-auto sm:mx-0">
                    Rate: 1 USD = {rate || 120} BDT
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {activeCurrency === 'USD' ? (
                    <div className="form-group">
                      <label className="form-label">Amount (USD)</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0.00"
                          min={userSettings?.minimumFundsToAddUSD || 0}
                          max={userSettings?.maximumFundsToAddUSD && userSettings.maximumFundsToAddUSD > 0 ? userSettings.maximumFundsToAddUSD : undefined}
                          step="0.01"
                          className={`form-field w-full pl-10 pr-4 py-3 dark:bg-gray-700/50 border ${
                            amountUSDError 
                              ? 'border-red-500 dark:border-red-500' 
                              : 'border-gray-300 dark:border-gray-600'
                          } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                          disabled={isPending}
                          value={form.watch('amountUSD') || ''}
                          onChange={handleUSDChange}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 font-semibold">
                          $
                        </span>
                      </div>
                      {amountUSDError && (
                        <p className="text-red-500 text-sm mt-1">
                          {amountUSDError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Amount (BDT)</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0.00"
                          min={userSettings?.minimumFundsToAddUSD ? (userSettings.minimumFundsToAddUSD * (rate || 120)) : 0}
                          max={userSettings?.maximumFundsToAddUSD && userSettings.maximumFundsToAddUSD > 0 ? (userSettings.maximumFundsToAddUSD * (rate || 120)) : undefined}
                          step="0.01"
                          className="form-field w-full pl-10 pr-4 py-3 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          disabled={isPending}
                          value={form.watch('amountBDT') || ''}
                          onChange={handleBDTChange}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 font-semibold">
                          ৳
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={toggleCurrency}
                      className="btn btn-secondary h-12 px-6 flex items-center gap-2"
                      disabled={isPending}
                      title={`Switch to ${
                        activeCurrency === 'USD' ? 'BDT' : 'USD'
                      }`}
                    >
                      <FaExchangeAlt className="text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold">
                        Switch to {activeCurrency === 'USD' ? 'BDT' : 'USD'}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-white dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 font-medium">
                    Converted Amount
                  </div>
                  {activeCurrency === 'USD' ? (
                    <div>
                      <div className="relative">
                        <input
                          type="text"
                          className={`form-field w-full pl-10 pr-4 py-3 dark:bg-gray-700/50 border ${
                            convertedAmountError 
                              ? 'border-red-500 dark:border-red-500' 
                              : 'border-gray-300 dark:border-gray-600'
                          } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                          disabled
                          placeholder="0.00 BDT"
                          value={formatNumber(form.watch('amountBDTConverted') || '0.00')}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 font-bold">
                          ৳
                        </span>
                      </div>
                      {convertedAmountError && (
                        <p className="text-red-500 text-sm mt-1">
                          {convertedAmountError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <input
                          type="text"
                          className={`form-field w-full pl-10 pr-4 py-3 dark:bg-gray-700/50 border ${
                            convertedAmountError 
                              ? 'border-red-500 dark:border-red-500' 
                              : 'border-gray-300 dark:border-gray-600'
                          } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                          disabled
                          placeholder="0.00 USD"
                          value={formatNumber(form.watch('amountUSD') || '0.00')}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 font-bold">
                          $
                        </span>
                      </div>
                      {convertedAmountError && (
                        <p className="text-red-500 text-sm mt-1">
                          {convertedAmountError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800/90 rounded-lg p-6 border border-blue-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Total Amount:
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatAmount(totalAmount.amount, totalAmount.currency)}
                  </span>
                </div>
                {totalAmount.currency === 'BDT' && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    ≈ {formatAmount(totalAmount.amount / (rate || 120), 'USD')}
                  </div>
                )}
                {totalAmount.currency === 'USD' && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    ≈ {formatAmount(totalAmount.amount * (rate || 120), 'BDT')}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isSubmittingRef.current && !isSubmitting) {
                    handleFormSubmit(e);
                  } else {
                    console.log('Button click ignored - already submitting');
                  }
                }}
                disabled={isPending || isSubmitting || !hasValidAmount || isSubmittingRef.current}
                className="btn btn-primary w-full h-14 text-lg font-bold"
              >
                {isPending || isSubmitting ? (
                  <div className="flex items-center gap-2">
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Add Funds
                  </div>
                )}
              </button>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card card-padding">
              <div className="card-header">
                <div className="card-icon">
                  <FaCreditCard />
                </div>
                <h3 className="card-title">Secure Payment</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                SSL encrypted transactions with UddoktaPay
              </p>
            </div>
            <div className="card card-padding">
              <div className="card-header">
                <div className="card-icon">
                  <FaShieldAlt />
                </div>
                <h3 className="card-title">100% Safe</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your financial data is protected
              </p>
            </div>
            <div className="card card-padding">
              <div className="card-header">
                <div className="card-icon">
                  <FaWallet />
                </div>
                <h3 className="card-title">Instant Credit</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Funds added immediately after payment
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddFundsPage() {
  const userTheme = useUserTheme();
  return userTheme === 'carbon' ? <CarbonAddFunds /> : <DefaultAddFunds />;
}
