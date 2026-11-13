'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import ReCAPTCHA from '@/components/recaptcha';
import { useSignIn } from '@/components/auth/use-sign-in';

/** Sign-in form of the Carbon theme (used on the landing page and on /sign-in). */
export default function CarbonSignInForm() {
  const {
    form,
    onSubmit,
    isPending,
    error,
    urlError,
    success,
    setError,
    showTwoFactor,
    showPassword,
    togglePasswordVisibility,
    isEnabledForForm,
    recaptchaSettings,
    setRecaptchaToken,
    userSettings,
    settingsLoading,
    maintenanceMode,
    showServicesWarning,
    handleGoogleSignIn,
  } = useSignIn();

  // Offer Google only when the panel actually has it configured.
  const [hasGoogle, setHasGoogle] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/providers')
      .then((response) => (response.ok ? response.json() : null))
      .then((providers) => {
        if (!cancelled && providers && providers.google) setHasGoogle(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = form.formState.errors;
  const message = error || urlError;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="cb-form" noValidate>
      {maintenanceMode === 'active' && (
        <div className="cb-alert is-warning">Maintenance is in progress. Only staff can sign in right now.</div>
      )}
      {showServicesWarning && <div className="cb-alert is-info">Please sign in to view the services list.</div>}

      {showTwoFactor ? (
        <div className="cb-field">
          <label className="cb-label" htmlFor="cb-code">
            2FA code
          </label>
          <input
            id="cb-code"
            className="cb-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={isPending}
            {...form.register('code')}
          />
          {errors.code?.message ? <small className="cb-hint is-error">{String(errors.code.message)}</small> : null}
        </div>
      ) : (
        <>
          <div className="cb-field">
            <label className="cb-label" htmlFor="cb-username">
              Username
            </label>
            <input
              id="cb-username"
              className="cb-input"
              type="text"
              autoComplete="username"
              disabled={isPending}
              {...form.register('email')}
            />
            {errors.email?.message ? <small className="cb-hint is-error">{String(errors.email.message)}</small> : null}
          </div>

          <div className="cb-field">
            <div className="cb-label-row">
              <label className="cb-label" htmlFor="cb-password">
                Password
              </label>
              {!settingsLoading && userSettings?.resetPasswordEnabled !== false ? (
                <Link href="/reset-password" className="cb-link">
                  Forgot password?
                </Link>
              ) : null}
            </div>
            <div className="cb-affix">
              <input
                id="cb-password"
                className="cb-input cb-input-plain"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isPending}
                {...form.register('password')}
              />
              <button
                type="button"
                className="cb-affix-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password?.message ? (
              <small className="cb-hint is-error">{String(errors.password.message)}</small>
            ) : null}
          </div>

          {isEnabledForForm('signIn') && recaptchaSettings ? (
            <ReCAPTCHA
              siteKey={recaptchaSettings.siteKey}
              version={recaptchaSettings.version}
              action="signin"
              threshold={recaptchaSettings.threshold}
              onVerify={(token) => setRecaptchaToken(token)}
              onError={() => setRecaptchaToken(null)}
              onExpired={() => {
                setRecaptchaToken(null);
                setError('ReCAPTCHA expired. Please verify again.');
              }}
            />
          ) : null}
        </>
      )}

      {message ? <div className="cb-alert is-error">{message}</div> : null}
      {success ? <div className="cb-alert is-success">{success}</div> : null}

      <button type="submit" className="cb-btn" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>

      {!showTwoFactor && hasGoogle ? (
        <button type="button" className="cb-btn cb-btn-ghost" disabled={isPending} onClick={handleGoogleSignIn}>
          Sign in with Google
        </button>
      ) : null}

      {!showTwoFactor ? (
        <p className="cb-note cb-center">
          Do not have an account?{' '}
          <Link href="/sign-up" className="cb-link">
            Sign up
          </Link>
        </p>
      ) : null}
    </form>
  );
}
