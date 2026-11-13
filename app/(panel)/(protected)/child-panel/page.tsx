'use client';

import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import React, { useEffect, useState, useMemo } from 'react';
import { USD_DEFAULT } from '@/lib/currency-utils';
import {
    FaCheckCircle,
    FaChevronDown,
    FaCopy,
    FaEye,
    FaEyeSlash,
    FaInfoCircle,
    FaQuestionCircle,
    FaServer,
    FaShoppingCart,
    FaTimes,
} from 'react-icons/fa';

interface FormData {
  domain: string;
  currency: string;
  username: string;
  password: string;
  passwordConfirm: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  rate: number;
  enabled: boolean;
}
import { useChildPanel } from '@/components/child-panel/use-child-panel';
import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonChildPanel from '@/components/themes/carbon/child-panel';

const GradientSpinner = ({ size = 'w-5 h-5', className = '' }) => (
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

const DefaultChildPanel: React.FC = () => {
  const {
    appName,
    formData,
    setFormData,
    openFAQ,
    setOpenFAQ,
    isLoading,
    setIsLoading,
    isPageLoading,
    setIsPageLoading,
    toast,
    setToast,
    currencies,
    setCurrencies,
    childPanelPriceUSD,
    setChildPanelPriceUSD,
    isDataLoading,
    setIsDataLoading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    nameservers,
    getPriceInCurrency,
    formatPrice,
    faqs,
    showToast,
    copyToClipboard,
    handleInputChange,
    handleSubmit,
    toggleFAQ,
  } = useChildPanel();

  if (isPageLoading) {
    return (
      <div className="page-container">
          <div className="page-content">
            <div className="mb-6">
              <div className="card card-padding bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  <div className="lg:col-span-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                      Create A Child Panel
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Create a child panel with your own domain and start your own
                      business. You can connect your child panel with {appName} and
                      start selling services to your customers.
                    </p>
                    <button className="btn btn-primary inline-flex items-center">
                      Get Started
                    </button>
                  </div>
                  <div className="lg:col-span-1 hidden lg:block">
                    <div className="flex justify-center">
                      <div className="w-48 h-32 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <FaServer className="w-16 h-16 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div id="childPanelOrder">
                  <div className="card card-padding">
                    <div className="card-header mb-6">
                      <div className="card-icon">
                        <FaShoppingCart />
                      </div>
                      <h3 className="card-title">Create Child Panel</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="form-group">
                        <div className="h-4 w-16 gradient-shimmer rounded mb-2" />
                        <div className="h-10 w-full gradient-shimmer rounded-lg" />
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="h-4 w-48 gradient-shimmer rounded mb-2" />
                        <div className="h-3 w-32 gradient-shimmer rounded mb-1" />
                        <div className="h-3 w-40 gradient-shimmer rounded" />
                      </div>

                      <div className="form-group">
                        <div className="h-4 w-20 gradient-shimmer rounded mb-2" />
                        <div className="h-10 w-full gradient-shimmer rounded-lg" />
                      </div>

                      <div className="form-group">
                        <div className="h-4 w-28 gradient-shimmer rounded mb-2" />
                        <div className="h-10 w-full gradient-shimmer rounded-lg" />
                      </div>

                      <div className="form-group">
                        <div className="h-4 w-32 gradient-shimmer rounded mb-2" />
                        <div className="h-10 w-full gradient-shimmer rounded-lg" />
                      </div>

                      <div className="form-group">
                        <div className="h-4 w-28 gradient-shimmer rounded mb-2" />
                        <div className="h-10 w-full gradient-shimmer rounded-lg" />
                      </div>

                      <div className="form-group">
                        <div className="h-4 w-32 gradient-shimmer rounded mb-2" />
                        <div className="h-10 w-full gradient-shimmer rounded-lg" />
                      </div>

                      <div className="pt-4">
                        <div className="h-10 w-full gradient-shimmer rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="card card-padding">
                  <div className="card-header">
                    <div className="card-icon">
                      <FaQuestionCircle />
                    </div>
                    <h3 className="card-title">Frequently Asked Questions</h3>
                  </div>

                  <div className="space-y-3 mt-4">
                    {faqs.slice(0, 3).map((faq, index) => (
                      <div key={index} className="card">
                        <div className="w-full p-4 text-left flex justify-between items-center">
                          <span className="flex items-start gap-2 font-medium text-gray-900 dark:text-gray-100 pr-4">
                            <FaInfoCircle className="w-4 h-4 flex-shrink-0 mt-1" />
                            <span>{faq.question}</span>
                          </span>
                          <FaChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
    <div className="page-container">
      <div className="toast-container">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>

      <div className="page-content">
        <div className="mb-6">
          <div className="card card-padding bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="lg:col-span-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Create A Child Panel
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Create a child panel with your own domain and start your own
                  business. You can connect your child panel with {appName} and
                  start selling services to your customers.
                </p>
                <a
                  href="#childPanelOrder"
                  className="btn btn-primary inline-flex items-center"
                >
                  Get Started
                </a>
              </div>
              <div className="lg:col-span-1 hidden lg:block">
                <div className="flex justify-center">
                  <div className="w-48 h-32 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <FaServer className="w-16 h-16 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div id="childPanelOrder">
              <div className="card card-padding">
                <div className="card-header mb-6">
                  <div className="card-icon">
                    <FaShoppingCart />
                  </div>
                  <h3 className="card-title">Create Child Panel</h3>
                </div>
                <div className="space-y-6">
                  <div className="form-group">
                    <label htmlFor="domain" className="form-label">
                      Domain
                    </label>
                    <input
                      type="text"
                      id="domain"
                      name="domain"
                      value={formData.domain}
                      onChange={handleInputChange}
                      className="form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                      placeholder="Enter your domain"
                      required
                    />
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <div className="font-semibold mb-2 flex items-center">
                        <FaInfoCircle className="mr-2" />
                        Please change nameservers to:
                      </div>
                      <ul className="ml-4 space-y-1">
                        <li className="flex items-center justify-between group">
                          <span>• {nameservers.ns1}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(nameservers.ns1, 'Nameserver copied!')}
                            className="ml-2 p-1 opacity-50 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer"
                            title="Copy nameserver"
                          >
                            <FaCopy className="h-3.5 w-3.5" />
                          </button>
                        </li>
                        <li className="flex items-center justify-between group">
                          <span>• {nameservers.ns2}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(nameservers.ns2, 'Nameserver copied!')}
                            className="ml-2 p-1 opacity-50 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer"
                            title="Copy nameserver"
                          >
                            <FaCopy className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="currency" className="form-label">
                      Currency
                    </label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      disabled={isDataLoading || currencies.length === 0}
                      className="form-field w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    >
                      {isDataLoading ? (
                        <option value="">Loading currencies...</option>
                      ) : currencies.length === 0 ? (
                        <option value="">No currencies available</option>
                      ) : (
                        currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.name} ({currency.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="username" className="form-label">
                      Admin username
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        target.value = target.value.toLowerCase();
                      }}
                      className="form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                      placeholder="Enter admin username"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      Admin password
                    </label>
                    <div className="password-input-container">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="form-field w-full px-4 py-3 pr-10 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                        placeholder="Enter admin password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="password-toggle text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {showPassword ? (
                          <FaEyeSlash className="h-4 w-4" />
                        ) : (
                          <FaEye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="passwordConfirm" className="form-label">
                      Confirm password
                    </label>
                    <div className="password-input-container">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="passwordConfirm"
                        name="passwordConfirm"
                        value={formData.passwordConfirm}
                        onChange={handleInputChange}
                        className="form-field w-full px-4 py-3 pr-10 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                        placeholder="Confirm admin password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="password-toggle text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {showConfirmPassword ? (
                          <FaEyeSlash className="h-4 w-4" />
                        ) : (
                          <FaEye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="price" className="form-label">
                      Price per month
                    </label>
                    <input
                      type="text"
                      id="price"
                      value={isDataLoading ? 'Loading...' : formatPrice(getPriceInCurrency(childPanelPriceUSD, formData.currency), formData.currency)}
                      className="form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                      readOnly
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="btn btn-primary w-full"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <GradientSpinner size="w-5 h-5" />
                          Processing...
                        </div>
                      ) : (
                        'Submit Order'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card card-padding">
              <div className="card-header">
                <div className="card-icon">
                  <FaQuestionCircle />
                </div>
                <h3 className="card-title">Frequently Asked Questions</h3>
              </div>

              <div className="space-y-3 mt-4">
                {faqs.map((faq, index) => (
                  <div key={index} className="card">
                    <button
                      className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      onClick={() => toggleFAQ(index)}
                    >
                      <span className="flex items-start gap-2 font-medium text-gray-900 dark:text-gray-100 pr-4">
                        <FaInfoCircle className="w-4 h-4 flex-shrink-0 mt-1" />
                        <span>{faq.question}</span>
                      </span>
                      <div
                        className={`transform transition-transform duration-200 ${
                          openFAQ === index ? 'rotate-180' : 'rotate-0'
                        }`}
                      >
                        <FaChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      </div>
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        openFAQ === index
                          ? 'max-h-96 opacity-100'
                          : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChildPanel() {
  const userTheme = useUserTheme();
  return userTheme === 'carbon' ? <CarbonChildPanel /> : <DefaultChildPanel />;
}
