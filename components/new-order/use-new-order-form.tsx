
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

// State, data loading and submission for the New order form. Shared by every
// user theme so each theme only supplies its own markup.
const NEW_ORDER_PLATFORM_EVENT = 'tc:new-order-platform';

/** Filters the New order form to one platform (null = all). Used by the platform shortcuts of every theme. */
export function setNewOrderPlatform(keyword: string | null) {
  window.dispatchEvent(new CustomEvent(NEW_ORDER_PLATFORM_EVENT, { detail: keyword }));
}

export function useNewOrderForm() {
  const user = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { data: userStatsResponse, refetch: refetchUserStats } =
    useGetUserStatsQuery(undefined);
  const serviceIdFromUrl =
    searchParams?.get('sId') || searchParams?.get('serviceId');
  const categoryIdFromUrl = searchParams?.get('categoryId');
  // The platform filter lives in state (seeded from ?platform= on load) so a
  // chip click filters instantly; see setNewOrderPlatform below.
  const [platformFromUrl, setPlatformFromUrl] = useState<string | null>(searchParams?.get('platform') ?? null);
  useEffect(() => {
    const onPlatform = (event: Event) => setPlatformFromUrl((event as CustomEvent<string | null>).detail ?? null);
    window.addEventListener(NEW_ORDER_PLATFORM_EVENT, onPlatform);
    return () => window.removeEventListener(NEW_ORDER_PLATFORM_EVENT, onPlatform);
  }, []);
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'pending';
  } | null>(null);
  const [massOrderEnabled, setMassOrderEnabled] = useState<boolean | null>(null);

  const {
    data: category,
    error: categoryError,
    isLoading: categoryLoading,
  } = useGetCategories();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [qty, setQty] = useState(0);
  const [link, setLink] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');

  const [favoriteCategories, setFavoriteCategories] = useState<any[]>([]);
  const [combinedCategories, setCombinedCategories] = useState<any[]>([]);
  const [categoriesWithServices, setCategoriesWithServices] = useState<any[]>(
    []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [isServiceDetailsLoading, setIsServiceDetailsLoading] = useState(false);

  const [serviceTypeFields, setServiceTypeFields] = useState({
    comments: '',
    username: '',
    posts: undefined as number | undefined,
    delay: undefined as number | undefined,
    minQty: undefined as number | undefined,
    maxQty: undefined as number | undefined,
    isDripfeed: false,
    dripfeedRuns: undefined as number | undefined,
    dripfeedInterval: undefined as number | undefined,
    isSubscription: false,
  });
  const [serviceTypeErrors, setServiceTypeErrors] = useState<Record<string, string>>({});

  const showToast = (
    message: string | any,
    type: 'success' | 'error' | 'info' | 'pending' = 'success'
  ) => {
    const messageString = typeof message === 'string' 
      ? message 
      : (message?.message || message?.error || JSON.stringify(message) || 'An error occurred');
    setToastMessage({ message: messageString, type });
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleServiceTypeFieldChange = (field: string, value: any) => {
    setServiceTypeFields(prev => ({
      ...prev,
      [field]: value
    }));

    if (serviceTypeErrors[field]) {
      setServiceTypeErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const resetServiceTypeFields = () => {
    setServiceTypeFields({
      comments: '',
      username: '',
      posts: undefined,
      delay: undefined,
      minQty: undefined,
      maxQty: undefined,
      isDripfeed: false,
      dripfeedRuns: undefined,
      dripfeedInterval: undefined,
      isSubscription: false,
    });
    setServiceTypeErrors({});
  };

  const selected = services?.find((s) => s.id === parseInt(selectedService) || s.id === selectedService);
  const perQty = Number(selected?.perqty) || 1;
  const serviceRate = Number(selected?.rate) || 0;
  const servicesDiscount = Number(userStatsResponse?.data?.servicesDiscount) || 0;
  const price = servicesDiscount <= 0 ? serviceRate : serviceRate * (1 - servicesDiscount / 100);

  const { currency, availableCurrencies, currentCurrencyData, currencySettings } = useCurrency();

  let totalPrice = 0;
  const baseUsdPrice = (price * qty) / 1000;

  if (currency === 'USD') {
    totalPrice = baseUsdPrice;
  } else if (currency === 'BDT') {

    const bdtCurrency = availableCurrencies?.find(c => c.code === 'BDT');
    const usdToBdtRate = bdtCurrency?.rate || 121;
    totalPrice = baseUsdPrice * usdToBdtRate;
  } else {

    const targetCurrency = availableCurrencies?.find(c => c.code === currency);
    const conversionRate = targetCurrency?.rate || 1;
    totalPrice = baseUsdPrice * conversionRate;
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFormLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkMassOrderStatus = async () => {
      try {
        const response = await axiosInstance.get('/api/mass-order-system-status');
        if (response.data.success) {
          setMassOrderEnabled(response.data.massOrderEnabled ?? false);
        } else {
          setMassOrderEnabled(false);
        }
      } catch (error) {
        console.error('Error checking mass order status:', error);
        setMassOrderEnabled(false);
      }
    };
    checkMassOrderStatus();
  }, []);

  useEffect(() => {
    if (user?.id) {
      axiosInstance
        .get(`/api/user/services/favorites?userId=${user.id}`)
        .then((res) => {
          setFavoriteCategories(res?.data?.data || []);
        })
        .catch((error) => {
          console.error('Error fetching favorite categories:', error);
          showToast('Error fetching favorite categories', 'error');
        });
    }
  }, [user?.id]);

  useEffect(() => {
    const checkFavoriteCategories = async () => {
      const checkedFavorites = await Promise.all(
        favoriteCategories.map(async (favCat) => {
          try {
            const res = await axios.post('/api/user/services/favserviceById', {
              favrouteCatId: favCat.id,
            });
            return {
              ...favCat,
              hasServices: res?.data?.data?.length > 0,
            };
          } catch (error) {
            return {
              ...favCat,
              hasServices: false,
            };
          }
        })
      );
      return checkedFavorites.filter((fav) => fav.hasServices);
    };

    if (favoriteCategories.length > 0) {
      checkFavoriteCategories().then((validFavorites) => {
        if (category?.data) {
          let combined = [
            ...validFavorites.map((favCat) => ({
              ...favCat,
              isFavorite: true,
              category_name: `⭐ ${favCat.name}`,
            })),

            ...category.data.map((regCat: any) => ({
              ...regCat,
              isFavorite: false,
            })),
          ];

          if (platformFromUrl && platformFromUrl !== 'Everything') {
            combined = combined
              .filter((cat) =>
                platformFromUrl === 'Others'
                  ? ![
                      'Instagram',
                      'Facebook',
                      'YouTube',
                      'TikTok',
                      'Twitter',
                      'Telegram',
                      'Spotify',
                      'LinkedIn',
                      'Discord',
                      'Website',
                    ].some((keyword) =>
                      cat.category_name
                        .toLowerCase()
                        .includes(keyword.toLowerCase())
                    )
                  : cat.category_name
                      .toLowerCase()
                      .includes(platformFromUrl.toLowerCase())
              )
              .sort((a, b) => {
                const aMatch = a.category_name
                  .toLowerCase()
                  .includes(platformFromUrl.toLowerCase())
                  ? -1
                  : 1;
                const bMatch = b.category_name
                  .toLowerCase()
                  .includes(platformFromUrl.toLowerCase())
                  ? -1
                  : 1;
                return aMatch - bMatch;
              });
          }

          setCombinedCategories(combined);
          setCategoriesWithServices(combined);

          if (combined.length > 0) {
            const currentInList = selectedCategory && combined.some((c: any) => String(c.id) === String(selectedCategory));
            if (platformFromUrl && platformFromUrl !== 'Everything') {
              if (!selectedCategory || !currentInList) {
                setSelectedCategory(combined[0].id);
              }
            } else if (!selectedCategory) {
              setSelectedCategory(combined[0].id);
            }
          }
          if (combined.length === 0 && selectedCategory) {
            // Nothing on this platform: do not keep a category from another one selected.
            setSelectedCategory('');
            setSelectedService('');
          }
        }
      });
    } else if (category?.data) {
      let regularCategories = category.data.map((regCat: any) => ({
        ...regCat,
        isFavorite: false,
      }));

      if (platformFromUrl && platformFromUrl !== 'Everything') {
        regularCategories = regularCategories
          .filter((cat: any) =>
            platformFromUrl === 'Others'
              ? ![
                  'Instagram',
                  'Facebook',
                  'YouTube',
                  'TikTok',
                  'Twitter',
                  'Telegram',
                  'Spotify',
                  'LinkedIn',
                  'Discord',
                  'Website',
                ].some((keyword) =>
                  cat.category_name
                    .toLowerCase()
                    .includes(keyword.toLowerCase())
                )
              : cat.category_name
                  .toLowerCase()
                  .includes(platformFromUrl.toLowerCase())
          )
          .sort((a: any, b: any) => {
            const aMatch = a.category_name
              .toLowerCase()
              .includes(platformFromUrl.toLowerCase())
              ? -1
              : 1;
            const bMatch = b.category_name
              .toLowerCase()
              .includes(platformFromUrl.toLowerCase())
              ? -1
              : 1;
            return aMatch - bMatch;
          });
      }

      setCombinedCategories(regularCategories);
      setCategoriesWithServices(regularCategories);

      if (regularCategories.length > 0) {
        const currentInList = selectedCategory && regularCategories.some((c: any) => String(c.id) === String(selectedCategory));
        if (platformFromUrl && platformFromUrl !== 'Everything') {
          if (!selectedCategory || !currentInList) {
            setSelectedCategory(regularCategories[0].id);
          }
        } else if (!selectedCategory) {
          setSelectedCategory(regularCategories[0].id);
        }
      }
    }
  }, [category, favoriteCategories, platformFromUrl, selectedCategory]);

  useEffect(() => {
    if (!selectedCategory) return;

    console.log('Selected category changed:', selectedCategory);
    setIsServiceDetailsLoading(true);
    
    const currentSelectedService = selectedService;
    setServices([]);

    axios
      .post('/api/admin/services/catId-by-services', {
        categoryId: parseInt(selectedCategory),
      })
      .then((res) => {
        const fetchedServices = res?.data?.data || [];
        console.log('Fetched services for category', selectedCategory, ':', fetchedServices);
        setServices(fetchedServices);
        
        const serviceExists = fetchedServices.some((s: any) => 
          String(s.id) === String(currentSelectedService) || s.id === parseInt(String(currentSelectedService))
        );
        
        if (serviceExists) {
          setSelectedService(String(currentSelectedService));
          console.log('Preserved selected service:', currentSelectedService);
        } else if (fetchedServices?.length > 0) {
          setSelectedService(String(fetchedServices[0]?.id));
          console.log('Auto-selected service:', fetchedServices[0]?.id);
          resetServiceTypeFields();
        } else {
          setSelectedService('');
          console.log('No services found for category:', selectedCategory);
          resetServiceTypeFields();
        }
      })
      .catch((error) => {
        console.error('Error fetching services:', error);
        showToast('Error fetching services', 'error');
        setServices([]);
        if (!currentSelectedService) {
          setSelectedService('');
        }
      })
      .finally(() => {
        setIsServiceDetailsLoading(false);
      });
  }, [selectedCategory]);

  useEffect(() => {
    if (
      categoryIdFromUrl &&
      combinedCategories.length > 0 &&
      !selectedCategory
    ) {
      const categoryExists = combinedCategories.find(
        (cat: any) => cat.id === categoryIdFromUrl
      );
      if (categoryExists) {
        setSelectedCategory(categoryIdFromUrl);
      }
    }
  }, [categoryIdFromUrl, combinedCategories, selectedCategory]);

  useEffect(() => {
    if (serviceIdFromUrl && !selectedService && category?.data) {
      const allServices = category?.data?.flatMap(
        (cat: any) => cat.services || []
      );
      const serviceFromUrl = allServices.find(
        (s: any) => s.id === serviceIdFromUrl
      );

      if (serviceFromUrl) {
        setSelectedCategory(serviceFromUrl.categoryId);
        setSelectedService(serviceIdFromUrl);
        setSearch(serviceFromUrl.name);
      } else {
        fetchServiceById(serviceIdFromUrl);
      }
    }
  }, [serviceIdFromUrl, category]);

  const fetchServiceById = async (serviceId: string) => {
    try {
      const res = await axiosInstance.get(
        `/api/user/services/serviceById?svId=${serviceId}`
      );
      const service = res?.data?.data;
      if (service) {
        setSelectedCategory(service.categoryId);
        setSelectedService(service.id);
        setSearch(service.name);
      }
    } catch (error) {
      showToast('Error fetching service details', 'error');
    }
  };

  async function getServices() {
    try {
      setIsSearchLoading(true);
      const res = await axiosInstance.get(
        `/api/user/services/neworderservice?search=${encodeURIComponent(search)}`
      );
      let fetchedServices = res?.data?.data || [];

      if (platformFromUrl && platformFromUrl !== 'Everything') {
        fetchedServices = fetchedServices.filter((service: any) => {
          const serviceCategory = combinedCategories.find(
            (cat) => cat.id === service.categoryId
          );
          if (!serviceCategory) return false;
          if (platformFromUrl === 'Others') {
            return ![
              'Instagram',
              'Facebook',
              'YouTube',
              'TikTok',
              'Twitter',
              'Telegram',
              'Spotify',
              'LinkedIn',
              'Discord',
              'Website',
            ].some((keyword) =>
              serviceCategory.category_name
                .toLowerCase()
                .includes(keyword.toLowerCase())
            );
          }
          return serviceCategory.category_name
            .toLowerCase()
            .includes(platformFromUrl.toLowerCase());
        });
      }

      setServicesData(fetchedServices);
    } catch (error) {
      showToast('Error fetching services', 'error');
    } finally {
      setIsSearchLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) {
        getServices();
      } else {
        setServicesData([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, platformFromUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        event.target && !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function decodeHTML(html: string) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  const userData = useSelector((state: any) => state.userDetails);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedService) {
      showToast('Please select a service', 'error');
      return;
    }

    if (selected?.orderLink === 'username') {
      if (!link || link.trim().length === 0) {
        showToast('Please enter a valid username', 'error');
        return;
      }
    } else {
      if (!link || !link.startsWith('http')) {
        showToast(
          'Please enter a valid link starting with http or https',
          'error'
        );
        return;
      }
    }

    if (qty < 1) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }

    const minOrder = toNumber(selected?.min_order);
    const maxOrder = toNumber(selected?.max_order);

    if (qty < minOrder) {
      showToast(`Minimum order quantity is ${toString(selected?.min_order) || '0'}`, 'error');
      return;
    }

    if (qty > maxOrder) {
      showToast(`Maximum order quantity is ${toString(selected?.max_order) || '0'}`, 'error');
      return;
    }

    const userBalanceAmount =
      userStatsResponse?.data?.balance ||
      (userData as any)?.balance ||
      (user as any)?.balance ||
      0;
    const finalTotalPrice = parseFloat(totalPrice.toFixed(4));

    if (userBalanceAmount < finalTotalPrice) {
      showToast(
        `Insufficient balance to create this order. Available: ${userBalanceAmount.toFixed(
          2
        )}, Required: ${finalTotalPrice.toFixed(2)}`,
        'error'
      );
      return;
    }

    const serviceTypeId = selected?.packageType || 1;
    const typeConfig = getServiceTypeConfig(serviceTypeId);
    const validationData = {
      link,
      qty,
      ...serviceTypeFields
    };

    const errors = typeConfig 
      ? validateOrderByType(serviceTypeId, validationData) 
      : { general: 'Unsupported or unknown service type' };

    if (errors && Object.keys(errors).length > 0) {
      const fieldErrors: Record<string, string> = {};
      
      Object.entries(errors).forEach(([field, message]) => {
        if (field === 'general') {
          showToast(`Service type validation failed: ${message}`, 'error');
        } else {
          fieldErrors[field] = message;
        }
      });

      if (Object.keys(fieldErrors).length > 0) {
        setServiceTypeErrors(fieldErrors);
        showToast('Please fix the highlighted fields', 'error');
      }
      return;
    }

    try {
    setIsSubmitting(true);

    const currentUserResponse = await axiosInstance.get('/api/user/current');
    const currentUser = currentUserResponse.data;

    const usdPrice = (price * qty) / 1000;

    const bdtCurrency = availableCurrencies?.find(c => c.code === 'BDT');
    const usdToBdtRate = bdtCurrency?.rate || 121;

    console.log('Price Calculation Debug:', {
      serviceRate: price,
      servicesDiscount,
      quantity: qty,
      usdPrice: usdPrice,
      finalTotalPrice: finalTotalPrice,
      userCurrency: currentUser?.currency,
      sessionUserCurrency: user?.currency,
    });

    const orderPayload = [
      {
        link: String(link || ''),
        qty: Number(qty) || 0,
        price: Number(finalTotalPrice) || 0,
        usdPrice: Number(usdPrice) || 0,
        currency: String(currentUser?.currency || user?.currency || 'USD'),
        serviceId: parseInt(String(selectedService)),
        categoryId: parseInt(String(selectedCategory)),
        userId: parseInt(String(user?.id || currentUser?.id || '')),
        avg_time: String(selected?.avg_time || 'N/A'),

        comments: serviceTypeFields.comments ? String(serviceTypeFields.comments) : undefined,
        username: serviceTypeFields.username ? String(serviceTypeFields.username) : undefined,
        posts: serviceTypeFields.posts ? Number(serviceTypeFields.posts) : undefined,
        delay: serviceTypeFields.delay ? Number(serviceTypeFields.delay) : undefined,
        minQty: serviceTypeFields.minQty ? Number(serviceTypeFields.minQty) : undefined,
        maxQty: serviceTypeFields.maxQty ? Number(serviceTypeFields.maxQty) : undefined,
        isDripfeed: Boolean(serviceTypeFields.isDripfeed || false),
        dripfeedRuns: serviceTypeFields.dripfeedRuns ? Number(serviceTypeFields.dripfeedRuns) : undefined,
        dripfeedInterval: serviceTypeFields.dripfeedInterval ? Number(serviceTypeFields.dripfeedInterval) : undefined,
        isSubscription: Boolean(serviceTypeFields.isSubscription || false),
      },
    ];

    const response = await axiosInstance.post(
      '/api/user/create-orders',
      orderPayload
    );

    if (response.data.success) {
      showToast('Order created successfully!', 'success');

      dispatch(dashboardApi.util.invalidateTags(['UserStats']));
      dispatch(userOrderApi.util.invalidateTags(['UserOrders']));

      refetchUserStats();

      setLink('');
      setQty(0);
      setSelectedService('');
      setSelectedCategory('');
      setSearch('');
      resetServiceTypeFields();

      setTimeout(() => {
        router.push('/my-orders');
      }, 1500);
    } else {
      const errorMsg = response.data?.message || 'Failed to create order';
      showToast(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg), 'error');
    }
  } catch (error: any) {
    console.error('Error creating order:', error);
    let errorMessage = 'Failed to create order';
    
    if (error.response) {
      const responseData = error.response.data;
      if (responseData?.message) {
        errorMessage = typeof responseData.message === 'string' 
          ? responseData.message 
          : JSON.stringify(responseData.message);
      } else if (responseData?.error) {
        errorMessage = typeof responseData.error === 'string' 
          ? responseData.error 
          : JSON.stringify(responseData.error);
      } else if (error.response.status === 404) {
        errorMessage = 'Selected service not found or inactive.';
      } else if (error.response.status === 400) {
        errorMessage = responseData?.message || 'Invalid order data. Please check your inputs.';
      } else if (error.response.status === 500) {
        errorMessage = responseData?.message || 'Server error. Please try again later.';
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    showToast(errorMessage, 'error');
  } finally {
    setIsSubmitting(false);
  }
  }

  const handleSearchSelect = (serviceId: string, categoryId: string) => {
    const selected = servicesData.find((s) => s.id === serviceId);

    if (selected) {
      setServicesData([]);
      setSearch(selected.name);
      setShowDropdown(false);
      resetServiceTypeFields();
      
      setSelectedService(String(serviceId));
      
      setServices((prevServices) => {
        const exists = prevServices.some((s) => s.id === serviceId || s.id === parseInt(serviceId));
        if (exists) {
          return prevServices;
        }
        return [...prevServices, selected];
      });
      
      setSelectedCategory(categoryId);
    }
  };

  return {
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
  };
}

export type NewOrderFormState = ReturnType<typeof useNewOrderForm>;
