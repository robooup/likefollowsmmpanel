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

// State, validation and submission for Mass orders. Shared by every user theme.
export function useMassOrder() {
  const { appName } = useAppNameWithFallback();

  const user = useCurrentUser();
  const router = useRouter();
  const dispatch = useDispatch();
  const { 
    currency, 
    rate: currencyRate,
    availableCurrencies,
    currentCurrencyData,
    currencySettings
  } = useCurrency();
  const { data: userStatsResponse, refetch: refetchUserStats } =
    useGetUserStatsQuery({});
  const userStats = userStatsResponse?.data;

  const [activeTab, setActiveTab] = useState<'newOrder' | 'massOrder'>(
    'massOrder'
  );
  const [orders, setOrders] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'pending';
  } | null>(null);
  const [massOrderEnabled, setMassOrderEnabled] = useState<boolean | null>(null);
  const [isAccessCheckLoading, setIsAccessCheckLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [balanceCheck, setBalanceCheck] = useState<ReturnType<typeof checkSufficientBalance> | null>(null);

  useEffect(() => {
    setPageTitle('Mass Orders', appName);
  }, [appName]);

  useEffect(() => {
    const checkMassOrderSettings = async () => {
      try {
        const response = await axiosInstance.get('/api/mass-order-system-status');
        if (response.data.success && response.data.massOrderEnabled) {
          setMassOrderEnabled(true);
        } else {
          setMassOrderEnabled(false);
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking mass order settings:', error);
        setMassOrderEnabled(false);
        router.push('/dashboard');
        return;
      } finally {
        setIsAccessCheckLoading(false);
      }
    };

    checkMassOrderSettings();
  }, [router]);

  useEffect(() => {
    if (!isAccessCheckLoading && massOrderEnabled) {
      const timer = setTimeout(() => {
        setIsFormLoading(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isAccessCheckLoading, massOrderEnabled]);

  const validateOrders = useCallback(async (input: string) => {
    if (!input.trim()) {
      setValidationResult(null);
      setValidationErrors([]);
      setTotalOrders(0);
      setTotalPrice(0);
      setBalanceCheck(null);
      return;
    }

    setIsValidating(true);
    try {
      const servicesDiscount = Number(userStats?.servicesDiscount) || 0;
      const result = await validateMassOrders(
        input,
        currentCurrencyData?.code || 'USD',
        availableCurrencies as Array<{ code: string; rate: number; symbol: string; name: string }>,
        servicesDiscount
      );

      setValidationResult(result);
      setValidationErrors(formatValidationErrors(result));
      setTotalOrders(result.validOrders.length);
      setTotalPrice(result.totalCostInUserCurrency);

      if (userStats?.balance !== undefined) {
        const balanceCheckResult = checkSufficientBalance(
          result,
          userStats.balance,
          availableCurrencies as Array<{ code: string; rate: number; symbol: string; name: string }>,
          currencySettings ? {
            decimals: currencySettings.displayDecimals ?? 2,
            decimal_separator: currencySettings.decimalSeparator ?? '.',
            thousand_separator: currencySettings.thousandsSeparator ?? ',',
            currencyPosition: currencySettings.currencyPosition || 'left'
          } : {
            decimals: 2,
            decimal_separator: '.',
            thousand_separator: ',',
            currencyPosition: 'left' as const
          }
        );
        setBalanceCheck(balanceCheckResult);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationErrors(['Failed to validate orders']);
    } finally {
      setIsValidating(false);
    }
  }, [currentCurrencyData, availableCurrencies, userStats, currencySettings]);

  const parseOrders = useCallback(async (text: string) => {
    await validateOrders(text);
  }, [validateOrders]);


  const balance = userStats?.balance || 0;
  const totalSpend = userStats?.totalSpent || 0;
  const totalOrdersCount = userStats?.totalOrders || 0;

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'pending' = 'success'
  ) => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const formatCurrency = (amount: number) => {
    if (currentCurrencyData && currencySettings) {
      return formatCurrencyAmount(amount, currentCurrencyData.code, availableCurrencies, currencySettings);
    }
    return `$${amount.toFixed(2)}`;
  };

  const handleNewOrderClick = () => {
    router.push('/new-order');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {

      if (!validationResult || validationResult.validOrders.length === 0) {
        showToast('Please enter at least one valid order', 'error');
        return;
      }

      if (balanceCheck && !balanceCheck.sufficient) {
        showToast(balanceCheck.message || 'Insufficient balance', 'error');
        return;
      }

      const batchId = `MO-${Date.now()}-${(user?.id || Math.random()).toString().slice(-4)}`;
      const orderArray = convertToApiFormat(validationResult, batchId);

      const response = await axiosInstance.post('/api/user/mass-orders', {
        orders: orderArray,
        batchId: batchId,
      });

      if (response.data.success) {
        showToast(
          `Successfully created ${response.data.summary.ordersCreated} orders!`,
          'success'
        );

        dispatch(dashboardApi.util.invalidateTags(['UserStats']));

        refetchUserStats();

        setOrders('');
        setTotalOrders(0);
        setTotalPrice(0);
        setValidationResult(null);
        setValidationErrors([]);
        setBalanceCheck(null);

        router.push('/my-orders');
      } else {
        showToast(response.data.message || 'Failed to create orders', 'error');
      }
    } catch (error) {
      console.error('Error creating Mass Orders:', error);
      const errorMessage =
        error instanceof Error && 'response' in error ?
        (error as any).response?.data?.message || error.message :
        error instanceof Error ? error.message :
        'Failed to create orders';
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}
