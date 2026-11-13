
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

// State, loading and favourites for the Services page. Shared by every user theme.
export function useServicesList() {
  const user = useCurrentUser();
  const { appName } = useAppNameWithFallback();
  const [services, setServices] = useState<Service[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [groupedServices, setGroupedServices] = useState<
    Record<string, Service[]>
  >({});
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'pending';
  } | null>(null);
  const [limit, setLimit] = useState('10');
  const [hasMoreData, setHasMoreData] = useState(true);
  const [favoriteServices, setFavoriteServices] = useState<Service[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const [totalServices, setTotalServices] = useState(0);
  const [displayLimit] = useState(50);

  useEffect(() => {
    setPageTitle('All Services', appName);
  }, [appName]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'pending' = 'success'
  ) => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 2000);
  };

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

  const fetchServices = React.useCallback(async () => {

    if (!debouncedSearch && page === 1) {
      setLoading(true);
    }

    try {
      const currentLimit = limit === 'all' ? '500' : limit;

      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: currentLimit,
        ...(debouncedSearch.trim() && { search: encodeURIComponent(debouncedSearch.trim()) })
      });

      const response = await fetch(
        `/api/user/services?${searchParams.toString()}`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }

        const data = await response.json();

        setTotalPages(data.totalPages || 1);
        setTotalServices(data.total || 0);
        setHasMoreData(page < (data.totalPages || 1));

        if (!user?.id) {
          const servicesData =
            data?.data?.map((service: Service) => ({
              ...service,
              isFavorite: false,
            })) || [];

          setServices(servicesData);

          processServicesData(servicesData, data.allCategories || []);
          return;
        }

        try {
          const favResponse = await fetch(
            `/api/user/services/favorite-status?userId=${user.id}`,
            {
              method: 'GET',
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
              },
            }
          );

          if (favResponse.ok) {
            const favData = await favResponse.json();
            const favoriteServiceIds = favData.favoriteServiceIds || [];

            const servicesWithFavorites = data?.data?.map((service: Service) => ({
              ...service,
              isFavorite: favoriteServiceIds.includes(service.id),
            })) || [];

            setServices(servicesWithFavorites);

            processServicesData(servicesWithFavorites, data.allCategories || []);
          } else {
            throw new Error('Failed to fetch favorites');
          }
        } catch (favError) {
          const servicesData = data?.data?.map((service: Service) => ({
            ...service,
            isFavorite: false,
          })) || [];

          setServices(servicesData);

          processServicesData(servicesData, data.allCategories || []);
        }
    } catch (error) {
      const { getUserFriendlyErrorMessage } = await import('@/lib/utils/frontend-error-handler');
      const errorMessage = getUserFriendlyErrorMessage(error);
      showToast(errorMessage, 'error');
      setServices([]);
      setGroupedServices({});
    } finally {
      setLoading(false);
      setIsSearchLoading(false);
    }
  }, [debouncedSearch, user?.id, page, limit]);

  const processServicesData = React.useCallback((servicesData: Service[], categoriesData: any[]) => {

    const favorites = servicesData.filter(service => service.isFavorite);
    setFavoriteServices(favorites);

    const groupedById: Record<string, { category: any; services: Service[] }> = {};

    categoriesData
      .filter((category: any) => category.hideCategory !== 'yes')
      .forEach((category: any) => {

        const categoryKey = `${category.category_name}_${category.id}`;
        groupedById[categoryKey] = {
          category: category,
          services: []
        };
      });

    servicesData.forEach((service: Service) => {
      const categoryId = service.category?.id;
      const categoryName = service.category?.category_name || 'Uncategorized';
      const categoryKey = categoryId ? `${categoryName}_${categoryId}` : 'Uncategorized_0';

      if (!groupedById[categoryKey]) {
        groupedById[categoryKey] = {
          category: service.category || { id: 0, category_name: 'Uncategorized', hideCategory: 'no', position: 999 },
          services: []
        };
      }
      groupedById[categoryKey].services.push(service);
    });

    const grouped: Record<string, Service[]> = {};
    Object.values(groupedById)
      .sort((a, b) => {

        const idDiff = (a.category.id || 999) - (b.category.id || 999);
        if (idDiff !== 0) return idDiff;

        return (a.category.position || 999) - (b.category.position || 999);
      })
      .forEach(({ category, services }) => {

        const displayName = `${category.category_name} (ID: ${category.id})`;
        grouped[displayName] = services;
      });

    setGroupedServices(grouped);

    const initialExpanded: Record<string, boolean> = {};
    Object.keys(grouped).forEach(categoryName => {
      initialExpanded[categoryName] = true;
    });

    setExpandedCategories(initialExpanded);
  }, []);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices, debouncedSearch, page, limit]);

  const handleLimitChange = (newLimit: string) => {
    setLimit(newLimit);
    setPage(1);
    setServices([]);
    setGroupedServices({});
    setHasMoreData(true);

    setTimeout(() => {
      fetchServices();
    }, 100);
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage(page - 1);
      setServices([]);
      setGroupedServices({});
      setHasMoreData(true);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      setPage(page + 1);
      setServices([]);
      setGroupedServices({});
    }
  };

  const handleViewDetails = (service: Service) => {
    setSelected(service);
    setIsOpen(true);
  };

  const toggleFavorite = async (serviceId: number) => {
    if (!user?.id) {
      showToast('You need to be logged in to favorite services', 'error');
      return;
    }

    try {

      const currentService = services.find(
        (service) => service.id === serviceId
      );
      if (!currentService) return;

      const response = await fetch('/api/user/services/servicefav', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
        body: JSON.stringify({
          serviceId,
          userId: user.id,
          action: currentService.isFavorite ? 'remove' : 'add',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setServices((prevServices) =>
          prevServices.map((service) =>
            service.id === serviceId
              ? { ...service, isFavorite: !service.isFavorite }
              : service
          )
        );

        setGroupedServices((prevGrouped) => {
          const newGrouped = { ...prevGrouped };
          Object.keys(newGrouped).forEach((categoryName) => {
            newGrouped[categoryName] = newGrouped[categoryName].map((service) =>
              service.id === serviceId
                ? { ...service, isFavorite: !service.isFavorite }
                : service
            );
          });
          return newGrouped;
        });

        setFavoriteServices((prevFavorites) => {
          if (currentService.isFavorite) {

            return prevFavorites.filter(service => service.id !== serviceId);
          } else {

            const updatedService = { ...currentService, isFavorite: true };
            return [...prevFavorites, updatedService];
          }
        });

        showToast(data.message, 'success');
      } else {
        throw new Error(data.error || 'Failed to update favorite status');
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'An error occurred',
        'error'
      );
    }
  };


  return {
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
  };
}
