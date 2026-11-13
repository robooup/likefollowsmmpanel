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

// Shared state and handlers; each user theme supplies its own markup.
export function useChildPanel() {
  const { appName } = useAppNameWithFallback();
  const [formData, setFormData] = useState<FormData>({
    domain: '',
    currency: 'USD',
    username: '',
    password: '',
    passwordConfirm: '',
  });

  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'pending';
  } | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [childPanelPriceUSD, setChildPanelPriceUSD] = useState<number>(10);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const nameservers = {
    ns1: '',
    ns2: '',
  };

  useEffect(() => {
    setPageTitle('Child Panel', appName);
  }, [appName]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsDataLoading(true);
        
        const currenciesResponse = await fetch('/api/currencies/enabled');
        if (currenciesResponse.ok) {
          const currenciesData = await currenciesResponse.json();
          if (currenciesData.success && currenciesData.currencies) {
            setCurrencies(currenciesData.currencies);
            if (currenciesData.currencies.length > 0) {
              const defaultCurrency = currenciesData.currencies.find((c: Currency) => c.code === 'USD') || currenciesData.currencies[0];
              setFormData(prev => {
                const currencyExists = currenciesData.currencies.find((c: Currency) => c.code === prev.currency);
                if (!currencyExists) {
                  return { ...prev, currency: defaultCurrency.code };
                }
                return prev;
              });
            }
          }
        }

        const priceResponse = await fetch('/api/user/child-panel/price');
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          if (priceData.success && priceData.price !== undefined) {
            setChildPanelPriceUSD(priceData.price);
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setCurrencies([USD_DEFAULT]);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
    
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getPriceInCurrency = (usdPrice: number, currencyCode: string): number => {
    const selectedCurrency = currencies.find(c => c.code === currencyCode);
    if (!selectedCurrency) return usdPrice;
    return usdPrice * selectedCurrency.rate;
  };

  const formatPrice = (price: number, currencyCode: string): string => {
    const selectedCurrency = currencies.find(c => c.code === currencyCode);
    if (!selectedCurrency) return `$${price.toFixed(2)}`;
    
    const formattedPrice = price.toFixed(2);
    return `${selectedCurrency.symbol}${formattedPrice}`;
  };

  const faqs: FAQ[] = useMemo(() => [
    {
      question: 'What is child panel?',
      answer:
        `A child panel is a panel with a limited selection of features that is linked to one of your regular panels such as ${appName}`,
    },
    {
      question: 'How much cost for a child panel?',
      answer:
        `It will cost you ${formatPrice(childPanelPriceUSD, 'USD')} per month. Please note, you paying for panel, not for services, you have to pay for the services you will purchase from ${appName}`,
    },
    {
      question: 'How long it will take to activate the child panel?',
      answer:
        'It will take 3-6 hrs to active your child panel if you changed your name server perfectly.',
    },
    {
      question: 'Do you need hosting for child panel?',
      answer: "No, for child panel you just need a domain and that's all.",
    },
    {
      question: 'I have domain, what i can do next?',
      answer:
        `If you have domain, you can simply change your domain name server and point it to ${nameservers.ns1} ${nameservers.ns2} After you successfully changed the name server, you can submit a order for child panel`,
    },
    {
      question: 'How can i change name server for my domain?',
      answer:
        `Its actually depend on your domain provider, if you go to your domain settings and choose custom DNS and enter the name server given by ${appName}.`,
    },
    {
      question: `How to i connect child panel with ${appName}?`,
      answer:
        `You can simply go to https://yourdomain.com/admin/settings/providers and you will find out option to connect your panel with ${appName}. You can a key to connect your panel with ${appName}. This key you will find out on settings of your ${appName} account.`,
    },
    {
      question:
        'How can i get refund for child panel if i am not interested to continue?',
      answer:
        'Unfortunately refund not possible after we activate your child panel. But you can terminate your child panel any time by creating a ticket to us.',
    },
    {
      question:
        'I want to change my child panel domain address, what i need to do?',
      answer:
        'You can simply, change your new domain name server and send to us your new domain address. We will replace your new domain with old domain. But, this change only possible for 1 time.',
    },
    {
      question: 'How can i activate affiliate on my child panel?',
      answer: 'Unfortunately, there is no affiliate feature on child panel',
    },
    {
      question: 'How can i add payment gateway on our child panel?',
      answer:
        'You can visit https://yourdomain.com/admin/settings/payments - Add method - Choose Payment Method',
    },
    {
      question: 'How can i collect money from our customer?',
      answer:
        "You customer will pay to your own payment gateway account, they are not paying to us. So, you don't have to worry about payment. Setup your own payment gateway, and collect payment from your customers",
    },
    {
      question:
        `If i connect our child panel with ${appName}, is there any way customer will find out about ${appName}?`,
      answer:
        `No, your customer will never know about ${appName}. They will place order on your website and your order will automatically place to ${appName} under your user account.`,
    },
  ], [childPanelPriceUSD, currencies, appName]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'pending' = 'success'
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        showToast(message, 'success');
      },
      (err) => {
        console.error('Could not copy text: ', err);
        showToast('Failed to copy to clipboard', 'error');
      }
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    let processedValue = value;

    if (name === 'username') {

      processedValue = value.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      showToast('Child panel order submitted successfully!', 'success');
      console.log('Form submitted:', formData);
    }, 1000);
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return {
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
  };
}
