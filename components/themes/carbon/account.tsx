'use client';

import { useState } from 'react';
import { FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';
import { useAccountSettings } from '@/components/account/use-account-settings';

function PasswordField({
  id,
  label,
  value,
  error,
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="cb-field">
      <label className="cb-label" htmlFor={id}>
        {label}
      </label>
      <div className="cb-affix">
        <input
          id={id}
          className="cb-input cb-input-plain"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="cb-affix-btn"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={() => setShow((v) => !v)}
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
      {error ? <small className="cb-hint is-error">{error}</small> : null}
    </div>
  );
}

export default function CarbonAccount() {
  const {
    userDetails,
    currentUser,
    isPageLoading,
    isUserDataLoading,
    toast,
    setToast,
    isLoading,
    // profile
    isEditingProfile,
    profileData,
    handleProfileDataChange,
    validationErrors,
    pendingEmailChange,
    hasProfileChanges,
    handleSaveProfileChanges,
    handleResendVerificationEmail,
    isSendingVerificationCode,
    // password
    formData,
    setFormData,
    validatePasswordField,
    handleSubmit,
    // 2FA
    twoFactor,
    handleTwoFactorToggle,
    // API key
    apiKey,
    showApiKey,
    setShowApiKey,
    copyToClipboard,
    copied,
    handleApiKeyGeneration,
    isGeneratingApiKey,
    // timezone
    timezones,
    selectedTimezone,
    setSelectedTimezone,
    selectedTimeFormat,
    setSelectedTimeFormat,
    handleTimezoneSave,
    isSavingTimezone,
    isSavingTimeFormat,
    // language
    languages,
    selectedLanguage,
    setSelectedLanguage,
    handleLanguageSave,
    isSavingLanguage,
  } = useAccountSettings();

  const user: any = userDetails || currentUser;
  const loading = isPageLoading || isUserDataLoading;
  const verified = !!user?.emailVerified;
  const setPassword = (field: 'currentPass' | 'newPass' | 'confirmNewPass', value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    validatePasswordField(field, value);
  };

  if (loading) {
    return (
      <div className="cb-page cb-narrow">
        {[0, 1, 2].map((card) => (
          <div key={card} className="cb-card">
            <div className="cb-skeleton">
              <div className="cb-skeleton-row" />
              <div className="cb-skeleton-row" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cb-page cb-narrow">
      {toast && (
        <div className={`cb-toast is-${toast.type || 'success'}`} role="status">
          <span>{toast.message}</span>
          <button type="button" aria-label="Close" onClick={() => setToast(null)}>
            <FaTimes />
          </button>
        </div>
      )}

      <div className="cb-tabs">
        <span className="cb-tab is-active">General</span>
      </div>

      <div className="cb-card">
        <div className="cb-form">
          <div className="cb-field">
            <label className="cb-label" htmlFor="cb-acc-username">
              Username
            </label>
            <input
              id="cb-acc-username"
              className="cb-input"
              type="text"
              readOnly={!isEditingProfile}
              value={isEditingProfile ? profileData.username : user?.username || profileData.username || ''}
              onChange={(event) => handleProfileDataChange('username', event.target.value)}
            />
            {validationErrors.username ? <small className="cb-hint is-error">{validationErrors.username}</small> : null}
          </div>

          <div className="cb-field">
            <label className="cb-label" htmlFor="cb-acc-name">
              Full name
            </label>
            <input
              id="cb-acc-name"
              className="cb-input"
              type="text"
              value={profileData.fullName}
              onChange={(event) => handleProfileDataChange('fullName', event.target.value)}
            />
            {validationErrors.fullName ? <small className="cb-hint is-error">{validationErrors.fullName}</small> : null}
          </div>

          <div className="cb-field">
            <div className="cb-label-row">
              <label className="cb-label" htmlFor="cb-acc-email">
                Email
              </label>
              {profileData.email === user?.email ? (
                <span className={`cb-badge ${verified && !pendingEmailChange ? 'is-ok' : 'is-warn'}`}>
                  {verified && !pendingEmailChange ? 'Verified' : 'Not verified'}
                </span>
              ) : null}
            </div>
            <input
              id="cb-acc-email"
              className="cb-input"
              type="email"
              readOnly={!verified}
              value={profileData.email}
              onChange={(event) => handleProfileDataChange('email', event.target.value)}
            />
            {validationErrors.email ? <small className="cb-hint is-error">{validationErrors.email}</small> : null}
            {pendingEmailChange ? (
              <small className="cb-hint">Pending verification for: {pendingEmailChange}</small>
            ) : null}
          </div>

          {(!verified || pendingEmailChange) && (
            <div className="cb-field">
              <label className="cb-label" htmlFor="cb-acc-code">
                Verification code{' '}
                {profileData.email !== user?.email && profileData.email ? (
                  <span className="cb-label-note">(optional)</span>
                ) : null}
              </label>
              <div className="cb-inline">
                <input
                  id="cb-acc-code"
                  className="cb-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={profileData.verificationCode}
                  onChange={(event) =>
                    handleProfileDataChange('verificationCode', event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                />
                <button
                  type="button"
                  className="cb-btn cb-btn-auto"
                  disabled={isSendingVerificationCode}
                  onClick={handleResendVerificationEmail}
                >
                  {isSendingVerificationCode ? 'Sending…' : 'Send code'}
                </button>
              </div>
            </div>
          )}

          <button type="button" className="cb-btn" disabled={!hasProfileChanges || isLoading} onClick={handleSaveProfileChanges}>
            {isLoading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="cb-card">
        <div className="cb-field">
          <label className="cb-label" htmlFor="cb-acc-lang">
            Language
          </label>
          <div className="cb-inline">
            <select
              id="cb-acc-lang"
              className="cb-input"
              value={selectedLanguage || ''}
              onChange={(event) => setSelectedLanguage(event.target.value)}
            >
              {languages.map((lang: any) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <button type="button" className="cb-btn cb-btn-auto" disabled={isSavingLanguage} onClick={handleLanguageSave}>
              {isSavingLanguage ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="cb-card">
        <form onSubmit={handleSubmit} className="cb-form">
          <PasswordField
            id="cb-acc-current"
            label="Current password"
            autoComplete="current-password"
            value={formData.currentPass || ''}
            error={validationErrors.currentPass}
            onChange={(value) => setPassword('currentPass', value)}
          />
          <PasswordField
            id="cb-acc-new"
            label="New password"
            autoComplete="new-password"
            value={formData.newPass || ''}
            error={validationErrors.newPass}
            onChange={(value) => setPassword('newPass', value)}
          />
          <PasswordField
            id="cb-acc-confirm"
            label="Confirm new password"
            autoComplete="new-password"
            value={formData.confirmNewPass || ''}
            error={validationErrors.confirmNewPass}
            onChange={(value) => setPassword('confirmNewPass', value)}
          />
          <button type="submit" className="cb-btn" disabled={isLoading}>
            {isLoading ? 'Changing password…' : 'Change password'}
          </button>
        </form>
      </div>

      <div className="cb-card">
        <div className="cb-form">
          <div className="cb-field">
            <span className="cb-label">Two-factor authentication</span>
            <p className="cb-note">
              Adds an extra layer of protection: when you sign in, a code is sent to your email address.
            </p>
          </div>
          <button type="button" className={`cb-btn ${twoFactor ? 'cb-btn-ghost' : ''}`} onClick={handleTwoFactorToggle}>
            {twoFactor ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      <div className="cb-card">
        <div className="cb-form">
          <div className="cb-field">
            <label className="cb-label" htmlFor="cb-acc-tz">
              Timezone
            </label>
            <div className="cb-inline">
              <select
                id="cb-acc-tz"
                className="cb-input"
                value={selectedTimezone || ''}
                onChange={(event) => setSelectedTimezone(event.target.value)}
              >
                {timezones.map((tz: any, index: number) => (
                  <option key={`${tz.timezone}-${index}`} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <select
                className="cb-input cb-input-short"
                aria-label="Time format"
                value={selectedTimeFormat}
                onChange={(event) => setSelectedTimeFormat(event.target.value as '12' | '24')}
              >
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
              </select>
              <button
                type="button"
                className="cb-btn cb-btn-auto"
                disabled={isSavingTimezone || isSavingTimeFormat}
                onClick={handleTimezoneSave}
              >
                {isSavingTimezone || isSavingTimeFormat ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="cb-card">
        <div className="cb-field">
          <label className="cb-label" htmlFor="cb-acc-key">
            API key
          </label>
          <div className="cb-inline">
            <div className="cb-affix cb-grow">
              <input
                id="cb-acc-key"
                className="cb-input cb-input-plain"
                type="text"
                readOnly
                placeholder={!apiKey ? 'No API key generated' : undefined}
                value={apiKey && showApiKey ? apiKey.key || '' : apiKey ? '••••••••••••••••••••••••••••••••' : ''}
              />
              {apiKey ? (
                <button
                  type="button"
                  className="cb-affix-btn"
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <FaEyeSlash /> : <FaEye />}
                </button>
              ) : null}
            </div>
            <button type="button" className="cb-btn cb-btn-ghost cb-btn-auto" disabled={!apiKey} onClick={() => copyToClipboard(apiKey)}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="cb-btn cb-btn-auto" disabled={isGeneratingApiKey} onClick={handleApiKeyGeneration}>
              {isGeneratingApiKey ? 'Generating…' : apiKey ? 'Generate new' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
