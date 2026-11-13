'use client';

import dynamic from 'next/dynamic';
import { DEFAULT_USER_PLACEHOLDER } from '@/lib/constants';
import { getCachedProfileImageUrl } from '@/lib/utils/profile-image-cache';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getUserDetails } from '@/lib/actions/getUser';
import { useAppNameWithFallback } from '@/contexts/app-name-context';
import { setPageTitle } from '@/lib/utils/set-page-title';
import { setUserDetails } from '@/lib/slice/userDetails';
import React, { useEffect, useMemo, useState } from 'react';

const MediaAttachModal = dynamic(
  () => import('@/components/media/media-attach-modal'),
  { ssr: false }
);
import {
    FaCamera,
    FaCheck,
    FaCheckCircle,
    FaClock,
    FaCopy,
    FaEye,
    FaEyeSlash,
    FaGlobe,
    FaKey,
    FaShieldAlt,
    FaTimes,
    FaUser,
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';

const UserToast = ({
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
      {type === 'success' && <FaCheck className="w-4 h-4" />}
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
      >
        <FaTimes className="w-3 h-3" />
      </button>
    </div>
  </div>
);

const AdminToast = ({
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

const Switch = ({ checked, onCheckedChange, onClick, title }: any) => (
  <button
    onClick={onClick}
    title={title}
    className={`switch ${checked ? 'switch-checked' : 'switch-unchecked'}`}
  >
    <span className="switch-thumb" />
  </button>
);

const PasswordInput = React.forwardRef<HTMLInputElement, any>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="password-input-container">
        <input
          type={showPassword ? 'text' : 'password'}
          className={className}
          ref={ref}
          {...props}
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
    );
  }
);

interface ApiKey {
  key: string;
  createdAt: Date;
  updatedAt: Date;
  id: number;
  userid: number;
}
import { useAccountSettings } from '@/components/account/use-account-settings';
import { useUserTheme } from '@/contexts/user-theme-context';
import CarbonAccount from '@/components/themes/carbon/account';

const ProfilePage = () => {
  const {
    appName,
    dispatch,
    currentUser,
    userDetails,
    apiKey,
    setApiKey,
    twoFactor,
    setTwoFactor,
    copied,
    setCopied,
    isLoading,
    setIsLoading,
    isPageLoading,
    setIsPageLoading,
    isUserDataLoading,
    setIsUserDataLoading,
    selectedLanguage,
    setSelectedLanguage,
    selectedTimezone,
    setSelectedTimezone,
    selectedTimeFormat,
    setSelectedTimeFormat,
    showApiKey,
    setShowApiKey,
    toast,
    setToast,
    formData,
    setFormData,
    isEditingProfile,
    setIsEditingProfile,
    profileData,
    setProfileData,
    hasProfileChanges,
    setHasProfileChanges,
    isSendingVerificationCode,
    setIsSendingVerificationCode,
    showMediaAttachModal,
    setShowMediaAttachModal,
    pendingEmailChange,
    setPendingEmailChange,
    isEmailVerificationPending,
    setIsEmailVerificationPending,
    isGeneratingApiKey,
    setIsGeneratingApiKey,
    isSavingTimezone,
    setIsSavingTimezone,
    isSavingTimeFormat,
    setIsSavingTimeFormat,
    isSavingLanguage,
    setIsSavingLanguage,
    profileImageError,
    setProfileImageError,
    validationErrors,
    setValidationErrors,
    isFormValid,
    setIsFormValid,
    languages,
    timezones,
    showToast,
    copyToClipboard,
    handleSubmit,
    handleTwoFactorToggle,
    handleApiKeyGeneration,
    handleTimezoneSave,
    handleLanguageSave,
    handleUpdateProfile,
    handleProfileDataChange,
    handleSaveProfileChanges,
    handleResendVerificationEmail,
    handleProfileImageSelected,
    validateEmail,
    validateFullName,
    validateUsername,
    validatePassword,
    validateConfirmPassword,
    validateProfileField,
    validatePasswordField,
  } = useAccountSettings();

  if (isPageLoading || isUserDataLoading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="card card-padding">
                <div className="card-header">
                  <div className="h-10 w-10 gradient-shimmer rounded-lg" />
                  <div className="h-6 w-40 gradient-shimmer rounded ml-3" />
                </div>
                <div className="space-y-4">
                  <div className="form-group">
                    <div className="h-4 w-24 gradient-shimmer rounded mb-2" />
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="h-4 w-28 gradient-shimmer rounded mb-2" />
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="h-4 w-20 gradient-shimmer rounded mb-2" />
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="h-10 w-32 gradient-shimmer rounded-lg" />
                    <div className="h-10 w-40 gradient-shimmer rounded-lg" />
                  </div>
                </div>
              </div>
              <div className="card card-padding">
                <div className="card-header">
                  <div className="h-10 w-10 gradient-shimmer rounded-lg" />
                  <div className="h-6 w-32 gradient-shimmer rounded ml-3" />
                </div>
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="h-24 w-24 gradient-shimmer rounded-full" />
                    <div className="absolute bottom-0 right-0 h-8 w-8 gradient-shimmer rounded-full border-2 border-white dark:border-gray-800" />
                  </div>
                  <div className="h-10 w-32 gradient-shimmer rounded-lg" />
                </div>
              </div>
              <div className="card card-padding">
                <div className="card-header">
                  <div className="h-10 w-10 gradient-shimmer rounded-lg" />
                  <div className="h-6 w-36 gradient-shimmer rounded ml-3" />
                </div>
                <div className="space-y-4">
                  <div className="form-group">
                    <div className="h-4 w-36 gradient-shimmer rounded mb-2" />
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="h-4 w-28 gradient-shimmer rounded mb-2" />
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="form-group">
                    <div className="h-4 w-40 gradient-shimmer rounded mb-2" />
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="h-10 w-full gradient-shimmer rounded-lg" />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="card card-padding">
                <div className="card-header mb-4">
                  <div className="h-10 w-10 gradient-shimmer rounded-lg" />
                  <div className="h-6 w-16 gradient-shimmer rounded ml-3" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-5 w-48 gradient-shimmer rounded mb-2" />
                    <div className="h-4 w-full gradient-shimmer rounded mb-1" />
                    <div className="h-4 w-3/4 gradient-shimmer rounded" />
                  </div>
                  <div className="h-6 w-11 gradient-shimmer rounded-full ml-4" />
                </div>
              </div>
              <div className="card card-padding">
                <div className="card-header">
                  <div className="h-10 w-10 gradient-shimmer rounded-lg" />
                  <div className="h-6 w-28 gradient-shimmer rounded ml-3" />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="h-4 w-20 gradient-shimmer rounded mb-2" />
                    <div className="h-[42px] w-full gradient-shimmer rounded-lg" />
                    <div className="h-3 w-32 gradient-shimmer rounded mt-2" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 w-24 gradient-shimmer rounded-lg" />
                    <div className="h-10 w-32 gradient-shimmer rounded-lg" />
                  </div>
                </div>
              </div>
              <div className="card card-padding">
                <div className="card-header">
                  <div className="h-10 w-10 gradient-shimmer rounded-lg" />
                  <div className="h-6 w-28 gradient-shimmer rounded ml-3" />
                </div>
                <div className="space-y-4">
                  <div className="form-group">
                    <div className="h-4 w-32 gradient-shimmer rounded mb-2" />
                    <div className="h-10 w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="h-10 w-full gradient-shimmer rounded-lg" />
                </div>
              </div>
              <div className="card card-padding">
                <div className="card-header">
                  <div className="h-10 w-10 gradient-shimmer rounded-lg" />
                  <div className="h-6 w-36 gradient-shimmer rounded ml-3" />
                </div>
                <div className="space-y-4">
                  <div className="form-group">
                    <div className="h-4 w-32 gradient-shimmer rounded mb-2" />
                    <div className="h-10 w-full gradient-shimmer rounded-lg" />
                  </div>
                  <div className="h-10 w-full gradient-shimmer rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = userDetails || currentUser;

  return (
    <div className="page-container">
      <div className="toast-container">
        {toast &&
          (currentUser?.role === 'admin' ? (
            <AdminToast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          ) : (
            <UserToast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          ))}
      </div>

      <div className="page-content">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="card card-padding">
              <div className="card-header">
                <div className="card-icon">
                  <FaUser />
                </div>
                <h3 className="card-title">Account Information</h3>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    value={
                      isEditingProfile ? profileData.username : (user?.username || profileData.username || '')
                    }
                    onChange={(e) =>
                      handleProfileDataChange('username', e.target.value)
                    }
                    readOnly={!isEditingProfile}
                    className={`form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border ${
                      validationErrors.username
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200`}
                    placeholder="Enter username"
                  />
                  {validationErrors.username && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.username}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) =>
                      handleProfileDataChange('fullName', e.target.value)
                    }
                    className={`form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border ${
                      validationErrors.fullName
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200`}
                    placeholder="Enter full name"
                  />
                  {validationErrors.fullName && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.fullName}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        handleProfileDataChange('email', e.target.value)
                      }
                      readOnly={!(user as any)?.emailVerified}
                      className={`form-field w-full px-4 py-3 border ${
                        !(user as any)?.emailVerified
                          ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-700/50'
                      } ${
                        !(user as any)?.emailVerified && !pendingEmailChange
                          ? 'border-red-500 dark:border-red-400'
                          : validationErrors.email
                          ? 'border-red-500 dark:border-red-400'
                          : 'border-gray-300 dark:border-gray-600'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200`}
                      placeholder="Enter email address"
                    />
                    {profileData.email === user?.email && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {(user as any)?.emailVerified && !pendingEmailChange ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Not Verified
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {validationErrors.email && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.email}</p>
                  )}
                  {pendingEmailChange && (
                    <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                      Pending verification for: {pendingEmailChange}
                    </p>
                  )}
                </div>

                {(!(user as any)?.emailVerified || pendingEmailChange) && (
                  <div className="form-group">
                    <label className="form-label">
                      {profileData.email !== user?.email && profileData.email
                        ? 'Verification Code (optional)'
                        : 'Verification Code'}
                    </label>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">
                      {profileData.email !== user?.email && profileData.email
                        ? 'Enter the code sent to your new email to verify immediately. Or save without code, your account will be unverified until you verify via login.'
                        : 'Enter the code sent to your email to verify your account.'}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={profileData.verificationCode}
                        onChange={(e) =>
                          handleProfileDataChange('verificationCode', e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        maxLength={6}
                        className="form-field w-32 px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                        placeholder="123456"
                      />
                      <button
                        type="button"
                        onClick={handleResendVerificationEmail}
                        disabled={isSendingVerificationCode}
                        className="btn btn-secondary whitespace-nowrap"
                      >
                        {isSendingVerificationCode ? 'Sending...' : 'Send Code'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {hasProfileChanges ? (
                    <button
                      onClick={handleSaveProfileChanges}
                      disabled={isLoading}
                      className="btn btn-primary"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="btn btn-primary opacity-50 cursor-not-allowed"
                    >
                      No Changes to Save
                    </button>
                  )}

                </div>
              </div>
            </div>
            <div className="card card-padding">
              <div className="card-header">
                <div className="card-icon">
                  <FaCamera />
                </div>
                <h3 className="card-title">Profile Picture</h3>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {((user?.image || DEFAULT_USER_PLACEHOLDER) && !profileImageError) ? (
                    <img
                      src={getCachedProfileImageUrl(user?.image || DEFAULT_USER_PLACEHOLDER)}
                      alt="Profile"
                      className="profile-picture object-cover"
                      onError={() => {
                        setProfileImageError(true);
                      }}
                    />
                  ) : (
                    <div className="profile-picture bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-semibold text-2xl">
                      {user?.username?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMediaAttachModal(true)}
                    className="profile-picture-edit cursor-pointer"
                    title="Change profile picture"
                  >
                    <FaCamera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <MediaAttachModal
                isOpen={showMediaAttachModal}
                onClose={() => setShowMediaAttachModal(false)}
                currentPath="avatars"
                singleFile
                showTabs={false}
                accept="image/*"
                maxFileSize={1 * 1024 * 1024}
                uploadHint="Image only [Max 1MB]"
                hideUploadPath
                onFilesUploaded={(fileUrls) => {
                  if (fileUrls[0]) {
                    handleProfileImageSelected(fileUrls[0]);
                  }
                }}
              />
            </div>

            <div className="card card-padding">
              <div className="card-header">
                <div className="card-icon">
                  <FaShieldAlt />
                </div>
                <h3 className="card-title">Change Password</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <PasswordInput
                    value={formData.currentPass || ''}
                    onChange={(e: any) => {
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        currentPass: value,
                      }));
                      validatePasswordField('currentPass', value);
                    }}
                    className={`form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border ${
                      validationErrors.currentPass
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200`}
                    placeholder="Enter current password"
                  />
                  {validationErrors.currentPass && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.currentPass}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <PasswordInput
                    value={formData.newPass || ''}
                    onChange={(e: any) => {
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        newPass: value,
                      }));
                      validatePasswordField('newPass', value);
                    }}
                    className={`form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border ${
                      validationErrors.newPass
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200`}
                    placeholder="Enter new password"
                  />
                  {validationErrors.newPass && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.newPass}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <PasswordInput
                    value={formData.confirmNewPass || ''}
                    onChange={(e: any) => {
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        confirmNewPass: value,
                      }));
                      validatePasswordField('confirmNewPass', value);
                    }}
                    className={`form-field w-full px-4 py-3 bg-white dark:bg-gray-700/50 border ${
                      validationErrors.confirmNewPass
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200`}
                    placeholder="Confirm new password"
                  />
                  {validationErrors.confirmNewPass && (
                    <p className="text-red-500 dark:text-red-400 text-sm mt-1">{validationErrors.confirmNewPass}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary w-full"
                >
                  {isLoading ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card card-padding">
              <div className="card-header mb-4">
                <div className="card-icon">
                  <FaShieldAlt />
                </div>
                <h3 className="card-title">2FA</h3>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="form-label">
                    Two-factor authentication
                  </label>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Email-based option to add an extra layer of protection to
                    your account. When signing in you'll need to enter a code
                    that will be sent to your email address.
                  </p>
                </div>
                <div className="ml-4">
                  <Switch
                    checked={twoFactor}
                    onCheckedChange={setTwoFactor}
                    onClick={handleTwoFactorToggle}
                    title={`${
                      twoFactor ? 'Disable' : 'Enable'
                    } Two-Factor Authentication`}
                  />
                </div>
              </div>
            </div>
            <div className="card card-padding hidden">
              <div className="card-header">
                <div className="card-icon">
                  <FaKey />
                </div>
                <h3 className="card-title">API Keys</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label mb-2">API Key</label>
                  <div className="api-key-container">
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={
                          apiKey && showApiKey
                            ? (apiKey.key || '')
                            : apiKey
                            ? '••••••••••••••••••••••••••••••••'
                            : ''
                        }
                        placeholder={!apiKey ? 'No API key generated' : undefined}
                        className="form-field w-full pr-20 font-mono px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                      />

                      {apiKey && (
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                          title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                        >
                          {showApiKey ? (
                            <FaEyeSlash className="h-4 w-4" />
                          ) : (
                            <FaEye className="h-4 w-4" />
                          )}
                        </button>
                      )}

                      {apiKey && (
                        <div className="api-key-timestamp">
                          <small>
                            Created:{' '}
                            {new Date(apiKey.createdAt).toLocaleString(
                              'en-US',
                              {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </small>
                        </div>
                      )}
                    </div>

                    <div className="api-key-buttons">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(apiKey)}
                        className="btn btn-secondary flex items-center justify-center gap-2"
                        disabled={!apiKey}
                      >
                        <FaCopy className="h-4 w-4" />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>

                      <button
                        onClick={handleApiKeyGeneration}
                        disabled={isGeneratingApiKey}
                        className="btn btn-primary"
                      >
                        {isGeneratingApiKey ? 'Generating...' : (apiKey ? 'Generate New' : 'Generate')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card card-padding">
              <div className="card-header">
                <div className="card-icon">
                  <FaClock />
                </div>
                <h3 className="card-title">Timezone</h3>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <select
                    value={selectedTimezone || ''}
                    onChange={(e) => setSelectedTimezone(e.target.value)}
                    className="form-field w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer"
                  >
                    {timezones.map((tz, index) => (
                      <option key={`${tz.timezone}-${index}`} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Time Format</label>
                  <select
                    value={selectedTimeFormat}
                    onChange={(e) => setSelectedTimeFormat(e.target.value as '12' | '24')}
                    className="form-field w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer"
                  >
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours</option>
                  </select>
                </div>
                <button
                  onClick={handleTimezoneSave}
                  disabled={isSavingTimezone || isSavingTimeFormat}
                  className="btn btn-primary"
                >
                  {(isSavingTimezone || isSavingTimeFormat) ? 'Saving...' : 'Save Timezone'}
                </button>
              </div>
            </div>
            <div className="card card-padding hidden">
              <div className="card-header">
                <div className="card-icon">
                  <FaGlobe />
                </div>
                <h3 className="card-title">Change Language</h3>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Select Language</label>
                  <select
                    value={selectedLanguage || ''}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="form-field w-full pl-4 pr-10 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] dark:focus:ring-[var(--secondary)] focus:border-transparent shadow-sm text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleLanguageSave}
                  disabled={isSavingLanguage}
                  className="btn btn-primary"
                >
                  {isSavingLanguage ? 'Saving...' : 'Save Language'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AccountSettingsPage() {
  const userTheme = useUserTheme();
  return userTheme === 'carbon' ? <CarbonAccount /> : <ProfilePage />;
}
