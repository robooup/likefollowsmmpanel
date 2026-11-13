
'use client';

import React, { useEffect, useState } from 'react';
import {
  FaCheckCircle,
  FaSearch,
  FaTimes
} from 'react-icons/fa';

import ServiceDetailsModal from '@/components/dashboard/services/modals/service-details';
import ServicesTable from '@/components/dashboard/services/services-table';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';

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
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded">
        <FaTimes className="w-3 h-3" />
      </button>
    </div>
  </div>
);

interface Service {
  id: number;
  name: string;
  rate: number;
  min_order: number;
  max_order: number;
  avg_time: string;
  description: string;
  category: {
    category_name: string;
    id: number;
  };
  serviceType?: {
    id: string;
    name: string;
  };
  isFavorite?: boolean;
  refill?: boolean;
  cancel?: boolean;
  refillDays?: number;
  refillDisplay?: number;
}
import { useServicesList } from '@/components/services/use-services-list';
import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonServices from '@/components/themes/carbon/services';

const UserServiceTable: React.FC = () => {
  const {
    user,
    appName,
    services,
    setServices,
    isOpen,
    setIsOpen,
    selected,
    setSelected,
    loading,
    setLoading,
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    setTotalPages,
    debouncedSearch,
    setDebouncedSearch,
    groupedServices,
    setGroupedServices,
    toastMessage,
    setToastMessage,
    limit,
    setLimit,
    hasMoreData,
    setHasMoreData,
    favoriteServices,
    setFavoriteServices,
    expandedCategories,
    setExpandedCategories,
    isSearchLoading,
    setIsSearchLoading,
    totalServices,
    setTotalServices,
    displayLimit,
    showToast,
    fetchServices,
    processServicesData,
    toggleCategory,
    handleLimitChange,
    handlePrevious,
    handleNext,
    handleViewDetails,
    toggleFavorite,
  } = useServicesList();

  if (loading && !debouncedSearch && page === 1) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="card card-padding">
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4 h-12">
                  <div className="h-12 w-40 gradient-shimmer rounded-lg" />
                  <div className="h-12 w-40 gradient-shimmer rounded-lg" />
                </div>
                <div className="w-full md:w-100 h-12">
                  <div className="h-12 w-full gradient-shimmer rounded-lg" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--card-bg)] rounded-t-lg">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <th key={idx} className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                          <div className="h-4 w-20 gradient-shimmer rounded" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 3 }).map((_, catIdx) => (
                      <React.Fragment key={catIdx}>
                        <tr>
                          <td colSpan={10} className="p-0">
                            <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-medium py-4 px-6">
                              <div className="flex items-center justify-between">
                                <div className="h-6 w-64 gradient-shimmer rounded" />
                                <div className="h-4 w-4 gradient-shimmer rounded" />
                              </div>
                            </div>
                          </td>
                        </tr>
                        {Array.from({ length: 5 }).map((_, serviceIdx) => (
                          <tr key={serviceIdx} className="border-b border-gray-100 dark:border-gray-600">
                            <td className="py-3 px-4">
                              <div className="h-4 w-4 gradient-shimmer rounded" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 w-12 gradient-shimmer rounded" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 w-48 gradient-shimmer rounded" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 w-16 gradient-shimmer rounded" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 w-12 gradient-shimmer rounded" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 w-12 gradient-shimmer rounded" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-4 w-16 gradient-shimmer rounded" />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="h-6 w-12 gradient-shimmer rounded mx-auto" />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="h-6 w-12 gradient-shimmer rounded mx-auto" />
                            </td>
                            <td className="py-3 px-4">
                              <div className="h-8 w-20 gradient-shimmer rounded" />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-600 dark:text-gray-300 text-center">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="h-5 w-48 gradient-shimmer rounded" />
                  <div className="h-5 w-32 gradient-shimmer rounded" />
                  <div className="h-5 w-32 gradient-shimmer rounded" />
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
            <div className="flex flex-row items-center gap-2 md:gap-4 md:justify-between">
              <div className="flex items-center h-12 flex-shrink-0">
                <div className="relative">
                  <select
                    value={limit}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    className="form-field pl-2 pr-6 py-3 md:pl-3 md:pr-7 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer text-xs md:text-sm min-w-[90px] md:min-w-[130px] h-12"
                  >
                    {totalServices > 0 && (
                      <>
                        {totalServices >= 10 && <option value="10">10 per page</option>}
                        {totalServices >= 25 && <option value="25">25 per page</option>}
                        {totalServices >= 50 && <option value="50">50 per page</option>}
                        {totalServices >= 100 && <option value="100">100 per page</option>}
                        {totalServices >= 200 && <option value="200">200 per page</option>}
                        {totalServices >= 500 && <option value="500">500 per page</option>}
                        <option value="all">Show All</option>
                      </>
                    )}
                    {totalServices === 0 && (
                      <option value="50">No services found</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="flex-1 md:w-100 h-12 items-center">
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
                      className="form-field w-full pl-10 pr-10 py-3 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 text-xs md:text-sm h-12"
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
          <ServicesTable
            groupedServices={groupedServices}
            expandedCategories={expandedCategories}
            isSearchLoading={isSearchLoading}
            onToggleCategory={toggleCategory}
            onToggleFavorite={toggleFavorite}
            onViewDetails={handleViewDetails}
            totalPages={totalPages}
            page={page}
            loading={loading}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        </div>
      </div>
      {isOpen && selected && (
        <ServiceDetailsModal
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          service={selected}
        />
      )}
    </div>
  );
};

export default function ServicesPage() {
  const userTheme = useUserTheme();
  return userTheme === 'carbon' ? <CarbonServices /> : <UserServiceTable />;
}
