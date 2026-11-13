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

// State, validation and payment start for the Add funds page. Shared by every user theme.
export function useAddFunds() {
  const user = useCurrentUser();
  const { appName } = useAppNameWithFallback();
  const [isPending, startTransition] = useTransition();
  const { currency: globalCurrency, rate: globalRate, currencySettings, availableCurrencies } = useCurrency();
  const { settings: userSettings } = useUserSettings();
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'pending';
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [amountUSDError, setAmountUSDError] = useState<string | null>(null);
  const [convertedAmountError, setConvertedAmountError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [exchangeRate, setExchangeRate] = useState<number>(120.00);

  useEffect(() => {
    setPageTitle('Add Funds', appName);
  }, [appName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('/api/payment-gateway/exchange-rate');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.exchangeRate) {
            setExchangeRate(data.exchangeRate);
          }
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
      }
    };

    fetchExchangeRate();
  }, []);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'pending' = 'success'
  ) => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const formatNumber = (num: number | string): string => {
    const numValue = typeof num === 'string' ? parseFloat(num) || 0 : num;
    if (currencySettings) {
      return formatNumberWithSettings(numValue, currencySettings);
    }
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatAmount = (amount: number, currencyCode: 'USD' | 'BDT'): string => {
    if (currencySettings && availableCurrencies.length > 0) {
      return formatCurrencyAmount(amount, currencyCode, availableCurrencies, currencySettings);
    }
    return `${currencyCode === 'USD' ? '$' : '৳'}${formatNumber(amount)}`;
  };

  const validateConvertedAmount = (usdAmount: number) => {
    if (!usdAmount || usdAmount === 0) {
      setConvertedAmountError(null);
      return;
    }

    const minAmountUSD = userSettings?.minimumFundsToAddUSD;
    const maxAmountUSD = userSettings?.maximumFundsToAddUSD && userSettings.maximumFundsToAddUSD > 0 
      ? userSettings.maximumFundsToAddUSD 
      : null;

    if (minAmountUSD && usdAmount < minAmountUSD) {
      const currentRate = rate || 120;
      const minAmountBDT = minAmountUSD * currentRate;
      if (activeCurrency === 'USD') {
        setConvertedAmountError(`Minimum amount is ${formatNumber(minAmountBDT)} BDT (${formatNumber(minAmountUSD)} USD)`);
      } else {
        setConvertedAmountError(`Minimum amount is ${formatNumber(minAmountUSD)} USD (≈ ${formatNumber(minAmountBDT)} BDT)`);
      }
    } else if (maxAmountUSD && usdAmount > maxAmountUSD) {
      const currentRate = rate || 120;
      const maxAmountBDT = maxAmountUSD * currentRate;
      if (activeCurrency === 'USD') {
        setConvertedAmountError(`Maximum amount is ${formatNumber(maxAmountBDT)} BDT (${formatNumber(maxAmountUSD)} USD)`);
      } else {
        setConvertedAmountError(`Maximum amount is ${formatNumber(maxAmountUSD)} USD (≈ ${formatNumber(maxAmountBDT)} BDT)`);
      }
    } else {
      setConvertedAmountError(null);
    }
  };

  const [activeCurrency, setActiveCurrency] = useState<'USD' | 'BDT'>(
    globalCurrency === 'USD' ? 'USD' : 'BDT'
  );

  const rate = exchangeRate || globalRate || 120;

  const form = useForm<AddFundSchema>({
    mode: 'all',
    resolver: zodResolver(addFundSchema),
    defaultValues: addFundDefaultValues,
  });

  useEffect(() => {
    if (userSettings?.minimumFundsToAddUSD && activeCurrency === 'USD') {
      const minAmountUSD = userSettings.minimumFundsToAddUSD;
      const currentRate = rate || 120;
      const minAmountBDT = minAmountUSD * currentRate;
      
      const currentUSD = form.getValues('amountUSD');
      if (!currentUSD || parseFloat(currentUSD) === 0) {
        form.setValue('amountUSD', minAmountUSD.toFixed(2), { shouldValidate: true });
        form.setValue('amountBDT', minAmountBDT.toFixed(2), { shouldValidate: true });
        form.setValue('amountBDTConverted', minAmountBDT.toFixed(2), { shouldValidate: true });
        form.setValue('amount', minAmountBDT.toFixed(2), { shouldValidate: true });
        setTotalAmount({
          amount: minAmountBDT,
          currency: 'BDT',
        });
      }
    }
  }, [userSettings?.minimumFundsToAddUSD, activeCurrency, exchangeRate]);

  useEffect(() => {
    const newCurrency = (globalCurrency === 'USD' || globalCurrency === 'BDT') ? globalCurrency : 'BDT';
    setActiveCurrency(newCurrency);
    setAmountUSDError(null);
    setConvertedAmountError(null);

    if (newCurrency === 'USD' && userSettings?.minimumFundsToAddUSD) {
      const minAmountUSD = userSettings.minimumFundsToAddUSD;
      const currentRate = rate || 120;
      const minAmountBDT = minAmountUSD * currentRate;
      form.setValue('amountUSD', minAmountUSD.toFixed(2), { shouldValidate: true });
      form.setValue('amountBDT', minAmountBDT.toFixed(2), { shouldValidate: true });
      form.setValue('amountBDTConverted', minAmountBDT.toFixed(2), { shouldValidate: true });
      form.setValue('amount', minAmountBDT.toFixed(2), { shouldValidate: true });
      setTotalAmount({
        amount: minAmountBDT,
        currency: 'BDT',
      });
    } else if (newCurrency === 'BDT' && userSettings?.minimumFundsToAddUSD) {
      const minAmountUSD = userSettings.minimumFundsToAddUSD;
      const currentRate = rate || 120;
      const minAmountBDT = minAmountUSD * currentRate;
      form.setValue('amountUSD', minAmountUSD.toFixed(2), { shouldValidate: true });
      form.setValue('amountBDT', minAmountBDT.toFixed(2), { shouldValidate: true });
      form.setValue('amountBDTConverted', minAmountBDT.toFixed(2), { shouldValidate: true });
      form.setValue('amount', minAmountBDT.toFixed(2), { shouldValidate: true });
      setTotalAmount({
        amount: minAmountBDT,
        currency: 'BDT',
      });
    } else {
      form.setValue('amountUSD', '0', { shouldValidate: true });
      form.setValue('amountBDT', '0', { shouldValidate: true });
      form.setValue('amountBDTConverted', '0', { shouldValidate: true });
      form.setValue('amount', '0', { shouldValidate: true });
      setTotalAmount({
        amount: 0,
        currency: newCurrency,
      });
    }
  }, [globalCurrency, userSettings?.minimumFundsToAddUSD, exchangeRate]);

  const amountUSDValue = form.watch('amountUSD');
  const amountBDTValue = form.watch('amountBDT');
  const methodValue = form.watch('method');

  const minAmountUSD = userSettings?.minimumFundsToAddUSD ?? 0;
  const maxAmountUSD = userSettings?.maximumFundsToAddUSD && userSettings.maximumFundsToAddUSD > 0 ? userSettings.maximumFundsToAddUSD : null;
  const effectiveUSD = activeCurrency === 'USD'
    ? parseFloat(amountUSDValue || '0') || 0
    : (parseFloat(amountBDTValue || '0') || 0) / (rate || 120);
  const hasValidAmount =
    (methodValue?.trim?.()?.length ?? 0) > 0 &&
    !amountUSDError &&
    !convertedAmountError &&
    effectiveUSD > 0 &&
    effectiveUSD >= minAmountUSD &&
    (maxAmountUSD == null || effectiveUSD <= maxAmountUSD);

  useEffect(() => {
    if (activeCurrency === 'USD') {
      const usdValue = parseFloat(amountUSDValue || '0');
      validateConvertedAmount(usdValue);
    } else {
      const currentRate = rate || 120;
      const bdtValue = parseFloat(amountBDTValue || '0');
      const usdValue = bdtValue / currentRate;
      validateConvertedAmount(usdValue);
    }
  }, [amountUSDValue, amountBDTValue, activeCurrency, exchangeRate, userSettings]);

  const toggleCurrency = () => {
    const newCurrency = activeCurrency === 'USD' ? 'BDT' : 'USD';
    setActiveCurrency(newCurrency);
    setAmountUSDError(null);
    setConvertedAmountError(null);

    if (newCurrency === 'USD' && userSettings?.minimumFundsToAddUSD) {
      const minAmountUSD = userSettings.minimumFundsToAddUSD;
      const currentRate = rate || 120;
      const minAmountBDT = minAmountUSD * currentRate;
      form.setValue('amountUSD', minAmountUSD.toFixed(2), { shouldValidate: true });
      form.setValue('amountBDT', minAmountBDT.toFixed(2), { shouldValidate: true });
      form.setValue('amountBDTConverted', minAmountBDT.toFixed(2), { shouldValidate: true });
      form.setValue('amount', minAmountBDT.toFixed(2), { shouldValidate: true });
      setTotalAmount({
        amount: minAmountBDT,
        currency: 'BDT',
      });
    } else {
      form.setValue('amountUSD', '0', { shouldValidate: true });
      form.setValue('amountBDT', '0', { shouldValidate: true });
      form.setValue('amountBDTConverted', '0', { shouldValidate: true });
      form.setValue('amount', '0', { shouldValidate: true });
      setTotalAmount({
        amount: 0,
        currency: 'BDT',
      });
    }
  };

  const [totalAmount, setTotalAmount] = useState<{
    amount: number;
    currency: 'USD' | 'BDT';
  }>({
    amount: 0,
    currency: 'BDT',
  });

  const handleUSDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentRate = rate || 120;
    const inputValue = e.target.value;
    const usdValue = parseFloat(inputValue) || 0;
    const bdtValue = usdValue * currentRate;

    if (!inputValue || inputValue.trim() === '') {
      setAmountUSDError(null);
    } else {
      const minAmountUSD = userSettings?.minimumFundsToAddUSD;
      const maxAmountUSD = userSettings?.maximumFundsToAddUSD && userSettings.maximumFundsToAddUSD > 0 
        ? userSettings.maximumFundsToAddUSD 
        : null;

      if (minAmountUSD && usdValue > 0 && usdValue < minAmountUSD) {
        setAmountUSDError(`Minimum amount is ${formatNumber(minAmountUSD)} USD`);
      } else if (maxAmountUSD && usdValue > maxAmountUSD) {
        setAmountUSDError(`Maximum amount is ${formatNumber(maxAmountUSD)} USD`);
      } else {
        setAmountUSDError(null);
      }
    }

    form.setValue('amountUSD', e.target.value, { shouldValidate: true });
    form.setValue('amountBDT', bdtValue.toFixed(2), { shouldValidate: true });
    form.setValue('amountBDTConverted', bdtValue.toFixed(2), {
      shouldValidate: true,
    });
    form.setValue('amount', bdtValue.toFixed(2), { shouldValidate: true });

    setTotalAmount({
      amount: bdtValue,
      currency: 'BDT',
    });

    validateConvertedAmount(usdValue);
  };

  const handleBDTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentRate = rate || 120;
    const bdtValue = parseFloat(e.target.value) || 0;
    const usdValue = bdtValue / currentRate;

    form.setValue('amountBDT', e.target.value, { shouldValidate: true });
    form.setValue('amountUSD', usdValue.toFixed(2), { shouldValidate: true });
    form.setValue('amount', bdtValue.toFixed(2), { shouldValidate: true });

    setTotalAmount({
      amount: bdtValue,
      currency: 'BDT',
    });

    validateConvertedAmount(usdValue);
  };

  const onSubmit: SubmitHandler<AddFundSchema> = useCallback(async (values) => {
    if (isSubmittingRef.current) {
      console.log('Submission already in progress (ref check), ignoring duplicate request');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    
    (async () => {
      try {
        const currentRate = exchangeRate || 120;
        const amountInBDT =
          activeCurrency === 'USD'
            ? parseFloat(values.amountUSD || '0') * currentRate
            : parseFloat(values.amountBDT || '0');

        if (!user?.name || !user?.email || amountInBDT <= 0) {
          showToast('Please fill in all required information', 'error');
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }

        const minAmountUSD = userSettings?.minimumFundsToAddUSD || 10;
        const maxAmountUSD = userSettings?.maximumFundsToAddUSD && userSettings.maximumFundsToAddUSD > 0 ? userSettings.maximumFundsToAddUSD : null;
        const minAmountBDT = minAmountUSD * currentRate;
        const maxAmountBDT = maxAmountUSD && maxAmountUSD > 0 ? maxAmountUSD * currentRate : null;
        const finalAmount = Math.round(amountInBDT);
        
        if (activeCurrency === 'USD') {
          const enteredUSD = parseFloat(values.amountUSD || '0');
          if (enteredUSD < minAmountUSD) {
            showToast(`Minimum amount must be ${minAmountUSD} USD`, 'error');
            isSubmittingRef.current = false;
            setIsSubmitting(false);
            return;
          }
          if (maxAmountUSD && enteredUSD > maxAmountUSD) {
            showToast(`Maximum amount must be ${maxAmountUSD} USD`, 'error');
            isSubmittingRef.current = false;
            setIsSubmitting(false);
            return;
          }
        }
        
        if (finalAmount < minAmountBDT) {
          showToast(`Minimum amount must be ${minAmountUSD} USD (≈ ${Math.round(minAmountBDT)} BDT)`, 'error');
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }
        
        if (maxAmountBDT && finalAmount > maxAmountBDT) {
          showToast(`Maximum amount must be ${maxAmountUSD} USD (≈ ${Math.round(maxAmountBDT)} BDT)`, 'error');
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }

        const amountValue = activeCurrency === 'USD' 
          ? parseFloat(values.amountUSD || '0')
          : parseFloat(values.amountBDT || '0');

        if (isNaN(amountValue) || amountValue <= 0) {
          showToast('Please enter a valid amount', 'error');
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }

        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        const formValues = {
          method: 'UddoktaPay',
          amount: amountValue.toString(),
          currency: activeCurrency,
          userId: user?.id,
          full_Name: user?.name || 'John Doe',
          email: user?.email || 'customer@example.com',
          requestId: requestId,
        };

        showToast('Payment processing...', 'pending');

        console.log('Sending payment request:', formValues);

        const res = await axiosInstance.post(
          '/api/payment/create-charge',
          formValues
        );

        if (res.data?.error) {
          console.error('Payment API error:', res.data);
          const errorMessage = res.data.error || 'Payment processing failed. Please try again.';
          showToast(errorMessage, 'error');
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }

          if (res.data && res.data.payment_url) {
            if (res.data.invoice_id) {
              const paymentSession = {
                invoice_id: res.data.invoice_id,
                amount: finalAmount.toString(),
                user_id: user?.id,
                timestamp: Date.now(),
              };
              sessionStorage.setItem(
                'payment_invoice_id',
                res.data.invoice_id
              );
              localStorage.setItem(
                'uddoktapay_session',
                JSON.stringify(paymentSession)
              );
            }

          showToast('Redirecting to payment page...', 'success');

          setTimeout(() => {
            window.location.href = res.data.payment_url;
          }, 500);
        } else {
          const errorMessage = res.data?.error || res.data?.message || 'Payment processing failed. Please try again.';
          console.error('Payment response missing payment_url:', res.data);
          showToast(errorMessage, 'error');
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      } catch (error: any) {
        console.error('Payment error:', {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
          error: error,
        });
        const errorMessage = error?.response?.data?.error || 
                            error?.response?.data?.message || 
                            error?.message || 
                            'Payment processing failed. Please try again.';
        showToast(errorMessage, 'error');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    })();
  }, [user, activeCurrency, exchangeRate, userSettings]);

  const handleFormSubmit = useMemo(() => {
    return form.handleSubmit(onSubmit);
  }, [onSubmit, form]);

  return {
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
  };
}
