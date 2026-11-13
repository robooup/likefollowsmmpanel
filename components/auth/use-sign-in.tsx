'use client';

import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import ReCAPTCHA from '@/components/recaptcha';
import { useUserSettings } from '@/hooks/use-user-settings';
import useReCAPTCHA from '@/hooks/useReCAPTCHA';
import { login } from '@/lib/actions/login';
import { DEFAULT_SIGN_IN_REDIRECT } from '@/lib/routes';
import {
  signInDefaultValues,
  SignInSchema,
  signInSchema,
} from '@/lib/validators/auth.validator';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { FaEye, FaEyeSlash, FaLock, FaUser } from 'react-icons/fa';

// State and submission for the sign-in form. Shared by every user theme.
export function useSignIn() {
  const searchParams = useSearchParams();

  const { settings: userSettings, loading: settingsLoading } = useUserSettings();

  let urlError = '';
  const errorParam = searchParams?.get('error');
  const messageParam = searchParams?.get('message');
  const reasonParam = searchParams?.get('reason');
  const [showServicesWarning, setShowServicesWarning] = useState<boolean>(false);
  const [maintenanceMode, setMaintenanceMode] = useState<'inactive' | 'active'>('inactive');

  if (errorParam === 'OAuthAccountNotLinked') {
    urlError = 'Email already in use with different provider!';
  } else if (messageParam === 'registration-disabled') {
    urlError = 'User registration is currently disabled by administrator.';
  } else if (messageParam === 'password-reset-disabled') {
    urlError = 'Password reset is currently disabled by administrator. Please contact support.';
  }

  useEffect(() => {
    if (reasonParam === 'services-restricted') {
      setShowServicesWarning(true);
    }
  }, [reasonParam]);

  useEffect(() => {
    const fetchMaintenanceMode = async () => {
      try {
        const response = await fetch('/api/public/general-settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.generalSettings?.maintenanceMode) {
            setMaintenanceMode(data.generalSettings.maintenanceMode);
          }
        }
      } catch (error) {
        console.error('Error fetching maintenance mode:', error);
      }
    };

    fetchMaintenanceMode();
  }, []);

  const [showTwoFactor, setShowTwoFactor] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>('');
  const [success, setSuccess] = useState<string | undefined>('');
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const { recaptchaSettings, isEnabledForForm } = useReCAPTCHA();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const form = useForm<SignInSchema>({
    mode: 'all',
    resolver: zodResolver(signInSchema),
    defaultValues: signInDefaultValues,
  });

  const onSubmit: SubmitHandler<SignInSchema> = async (values) => {
    setError('');
    setSuccess('');
    urlError = '';

    if (isEnabledForForm('signIn') && !recaptchaToken) {
      setError('Please complete the ReCAPTCHA verification.');
      return;
    }

    startTransition(() => {
      const submitData = recaptchaToken
        ? { ...values, recaptchaToken }
        : values;

      login(submitData)
        .then((data) => {
          if (data?.error) {
            setError(data.error);
            return;
          }

          if (data?.twoFactor) {
            setShowTwoFactor(true);
            return;
          }

          if (data?.requiresEmailVerification && data?.email) {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('pendingVerificationEmail', data.email);
            }
            setSuccess(data.message || 'Please verify your email to continue.');
            setTimeout(() => {
              window.location.href = '/verify-email';
            }, 1000);
            return;
          }

          if (data?.success) {
            const redirectUrl = data.redirectTo || '/dashboard';
            const isAdmin = data.isAdmin === true;

            setSuccess(isAdmin
              ? 'Login successful! Redirecting to admin dashboard...'
              : 'Login successful! Redirecting to dashboard...');

            console.log('Redirect URL:', redirectUrl);

            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 1000);
          }
        })
        .catch((err) => {
          console.error('Login error:', err);
          setError('An unexpected error occurred. Please try again.');
        });
    });
  };

  const handleGoogleSignIn = async () => {
    await signIn('google', { callbackUrl: DEFAULT_SIGN_IN_REDIRECT });
  };

  return {
    searchParams,
    userSettings,
    settingsLoading,
    urlError,
    errorParam,
    messageParam,
    reasonParam,
    showServicesWarning,
    setShowServicesWarning,
    maintenanceMode,
    setMaintenanceMode,
    showTwoFactor,
    setShowTwoFactor,
    isPending,
    startTransition,
    error,
    setError,
    success,
    setSuccess,
    showPassword,
    setShowPassword,
    recaptchaToken,
    setRecaptchaToken,
    recaptchaSettings,
    isEnabledForForm,
    togglePasswordVisibility,
    form,
    onSubmit,
    handleGoogleSignIn,
  };
}
