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

// State and actions for Account settings (profile, password, 2FA, API key, timezone, language). Shared by every user theme.
export function useAccountSettings() {
  const { appName } = useAppNameWithFallback();

  const dispatch = useDispatch();
  const currentUser = useCurrentUser();
  const userDetails = useSelector((state: any) => state.userDetails);
  // Used by the handlers below (the page defined it after they were declared).
  const user = userDetails || currentUser;

  useEffect(() => {
    setPageTitle('Account Settings', appName);
  }, [appName]);

  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [twoFactor, setTwoFactor] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isUserDataLoading, setIsUserDataLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Dhaka');
  const [selectedTimeFormat, setSelectedTimeFormat] = useState<'12' | '24'>('12');
  const [showApiKey, setShowApiKey] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'pending';
  } | null>(null);
  const [formData, setFormData] = useState({
    currentPass: '',
    newPass: '',
    confirmNewPass: '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    username: '',
    verificationCode: '',
  });
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const [isSendingVerificationCode, setIsSendingVerificationCode] = useState(false);
  const [showMediaAttachModal, setShowMediaAttachModal] = useState(false);
  const [pendingEmailChange, setPendingEmailChange] = useState<string | null>(null);
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState(false);
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);
  const [isSavingTimeFormat, setIsSavingTimeFormat] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const [validationErrors, setValidationErrors] = useState<{
    fullName?: string;
    email?: string;
    username?: string;
    verificationCode?: string;
    currentPass?: string;
    newPass?: string;
    confirmNewPass?: string;
  }>({});
  const [isFormValid, setIsFormValid] = useState(true);

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'bn', label: 'Bengali' },
    { value: 'ar', label: 'Arabic' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'hi', label: 'Hindi' },
  ];

  const timezones = useMemo(() => {
    try {
      const tzList = Intl.supportedValuesOf('timeZone');
      return tzList.map(timezone => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: timezone,
          timeZoneName: 'longOffset'
        });

        const offsetString = formatter.formatToParts(now)
          .find(part => part.type === 'timeZoneName')?.value || '';

        const offsetMinutes = -now.getTimezoneOffset();
        const targetDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const localDate = new Date(now.toLocaleString('en-US'));
        const offsetSeconds = Math.round((targetDate.getTime() - localDate.getTime()) / 1000) + (offsetMinutes * 60);

        return {
          value: timezone,
          label: `${offsetString} ${timezone.replace('_', ' ')}`,
          timezone: timezone,
          offsetSeconds: offsetSeconds
        };
      }).sort((a, b) => {
        if (a.offsetSeconds !== b.offsetSeconds) {
          return a.offsetSeconds - b.offsetSeconds;
        }
        return a.timezone.localeCompare(b.timezone);
      });
    } catch (error) {
      console.error('Error generating timezones:', error);
      return [
        { value: 'Asia/Dhaka', label: '(UTC+06:00) Asia/Dhaka', timezone: 'Asia/Dhaka', offsetSeconds: 21600 },
        { value: 'UTC', label: '(UTC+00:00) UTC', timezone: 'UTC', offsetSeconds: 0 },
        { value: 'Europe/Berlin', label: '(UTC+01:00) Europe/Berlin', timezone: 'Europe/Berlin', offsetSeconds: 3600 },
        { value: 'Asia/Kolkata', label: '(UTC+05:30) Asia/Kolkata', timezone: 'Asia/Kolkata', offsetSeconds: 19800 },
        { value: 'America/New_York', label: '(UTC-05:00) America/New York', timezone: 'America/New_York', offsetSeconds: -18000 },
      ];
    }
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsUserDataLoading(true);

        const userData = await getUserDetails();

        if (userData) {

          dispatch(setUserDetails(userData));

          setTwoFactor(userData.isTwoFactorEnabled || false);
          setSelectedLanguage((userData as any).language || 'en');

          const userTimezone = (userData as any).timezone;
          const userTimeFormat = (userData as any).timeFormat || '12';

          setSelectedTimezone(userTimezone || 'Asia/Dhaka');
          setSelectedTimeFormat((userTimeFormat === '12' || userTimeFormat === '24') ? userTimeFormat : '12');

          setProfileData({
            fullName: userData.name || '',
            email: userData.email || '',
            username: userData.username || '',
            verificationCode: '',
          });

          if ((userData as any).apiKey) {
            setApiKey({
              key: (userData as any).apiKey,
              createdAt: new Date(),
              updatedAt: new Date(),
              id: 1,
              userid: userData.id,
            });
          }
        } else {
          showToast('Failed to load user data', 'error');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
      } finally {
        setIsUserDataLoading(false);
        setIsPageLoading(false);
      }
    };

    if (currentUser?.id) {
      loadUserData();
    } else {
      setIsPageLoading(false);
      setIsUserDataLoading(false);
    }
  }, [currentUser?.id, dispatch]);

  useEffect(() => {
    if (userDetails?.apiKey && !apiKey) {
      setApiKey({
        key: userDetails.apiKey,
        createdAt: new Date(userDetails.apiKeyCreatedAt || new Date()),
        updatedAt: new Date(userDetails.apiKeyUpdatedAt || new Date()),
        id: userDetails.apiKeyId || 1,
        userid: userDetails.id,
      });
    }
  }, [userDetails, apiKey]);

  useEffect(() => {
    if (userDetails?.image || currentUser?.image) {
      setProfileImageError(false);
    }
  }, [userDetails?.image, currentUser?.image]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'pending' = 'success'
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const copyToClipboard = (key: ApiKey | null) => {
    if (key) {
      navigator.clipboard.writeText(key.key).then(() => {
        setCopied(true);
        showToast('API key copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.currentPass ||
      !formData.newPass ||
      !formData.confirmNewPass
    ) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (formData.newPass !== formData.confirmNewPass) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (formData.newPass.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsLoading(true);

    try {

      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPass,
          newPassword: formData.newPass,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setFormData({ currentPass: '', newPass: '', confirmNewPass: '' });
        showToast('Password changed successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to change password', 'error');
      }
    } catch (error) {
      console.error('Password change error:', error);
      showToast('Error changing password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    const nextState = !twoFactor;

    try {
      const response = await fetch('/api/user/toggle-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: nextState,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTwoFactor(nextState);

        dispatch(
          setUserDetails({
            ...userDetails,
            isTwoFactorEnabled: nextState,
          })
        );

        showToast(
          `Two-factor authentication ${
            nextState ? 'enabled' : 'disabled'
          } successfully!`,
          'success'
        );
      } else {
        showToast(result.message || 'Failed to toggle 2FA', 'error');
      }
    } catch (error) {
      console.error('2FA toggle error:', error);
      showToast('Error toggling 2FA', 'error');
    }
  };

  const handleApiKeyGeneration = async () => {
    setIsGeneratingApiKey(true);
    try {
      const response = await fetch('/api/user/generate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        const newApiKey = {
          key: result.data.apiKey,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
          id: result.data.id,
          userid: result.data.userId,
        };

        setApiKey(newApiKey);
        setShowApiKey(true);

        dispatch(
          setUserDetails({
            ...userDetails,
            apiKey: result.data.apiKey,
            apiKeyCreatedAt: result.data.createdAt,
            apiKeyUpdatedAt: result.data.updatedAt,
            apiKeyId: result.data.id,
          })
        );

        showToast('API key generated successfully!', 'success');
      } else {
        showToast(result.message || 'Failed to generate API key', 'error');
      }
    } catch (error) {
      console.error('API key generation error:', error);
      showToast('Error generating API key', 'error');
    } finally {
      setIsGeneratingApiKey(false);
    }
  };

  const handleTimezoneSave = async () => {
    setIsSavingTimezone(true);
    setIsSavingTimeFormat(true);
    try {
      const response = await fetch('/api/user/update-timezone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezone: selectedTimezone,
          timeFormat: selectedTimeFormat,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        dispatch(
          setUserDetails({
            ...userDetails,
            timezone: selectedTimezone,
            timeFormat: selectedTimeFormat,
          })
        );

        showToast('Timezone and time format updated successfully!', 'success');
      } else {
        showToast(result.message || 'Failed to update timezone and time format', 'error');
      }
    } catch (error) {
      console.error('Timezone and time format update error:', error);
      showToast('Error updating timezone and time format', 'error');
    } finally {
      setIsSavingTimezone(false);
      setIsSavingTimeFormat(false);
    }
  };

  const handleLanguageSave = async () => {
    setIsSavingLanguage(true);
    try {
      const response = await fetch('/api/user/update-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: selectedLanguage,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        dispatch(
          setUserDetails({
            ...userDetails,
            language: selectedLanguage,
          })
        );

        showToast('Language updated successfully!', 'success');
      } else {
        showToast(result.message || 'Failed to update language', 'error');
      }
    } catch (error) {
      console.error('Language update error:', error);
      showToast('Error updating language', 'error');
    } finally {
      setIsSavingLanguage(false);
    }
  };

  const handleUpdateProfile = () => {
    if (isEditingProfile) {

      setProfileData({
        username: user?.username || '',
        fullName: user?.name || '',
        email: user?.email || '',
        verificationCode: '',
      });
      setIsEditingProfile(false);
      setHasProfileChanges(false);
    } else {

      setIsEditingProfile(true);
    }
  };

  const handleProfileDataChange = (field: string, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field !== 'verificationCode') {
      validateProfileField(field, value);
    }

    const originalFullName = user?.name || '';
    const originalEmail = user?.email || '';
    const originalUsername = user?.username || '';

    const newData = {
      ...profileData,
      [field]: value,
    };

    const hasProfileFieldChanges =
      newData.fullName !== originalFullName || 
      newData.email !== originalEmail ||
      newData.username !== originalUsername;
    const hasVerificationCodeForUnverified = !!(user as any)?.emailVerified === false && !!newData.verificationCode?.trim();
    const hasChanges = hasProfileFieldChanges || hasVerificationCodeForUnverified;
    setHasProfileChanges(hasChanges);
  };

  const handleSaveProfileChanges = async () => {
    if (!hasProfileChanges) return;

    const emailError = validateEmail(profileData.email);
    const fullNameError = validateFullName(profileData.fullName);
    const usernameError = validateUsername(profileData.username);

    if (emailError || fullNameError || usernameError) {
      setValidationErrors({
        email: emailError || undefined,
        fullName: fullNameError || undefined,
        username: usernameError || undefined,
      });
      showToast('Please fix validation errors before saving', 'error');
      return;
    }

    setIsLoading(true);

    try {

      const originalEmail = user?.email || '';
      const isEmailChanged = profileData.email !== originalEmail;

      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: profileData.fullName,
          email: profileData.email,
          username: profileData.username,
          ...(profileData.verificationCode?.trim() && {
            verificationCode: profileData.verificationCode.trim(),
          }),
        }),
      });

      const result = await response.json();

      if (response.ok) {

        if (isEmailChanged) {
          const wasVerifiedWithCode = !!(profileData.verificationCode?.trim());
          if (wasVerifiedWithCode) {
            setPendingEmailChange(null);
            setIsEmailVerificationPending(false);
            showToast('Profile updated! Email changed and verified successfully.', 'success');
          } else {
            setPendingEmailChange(profileData.email);
            setIsEmailVerificationPending(true);
            showToast('Profile updated! Account is unverified. Please verify your new email address.', 'info');
          }
        } else if (result.data?.emailVerified && !(userDetails as any)?.emailVerified) {
          setPendingEmailChange(null);
          setIsEmailVerificationPending(false);
          showToast('Email verified successfully!', 'success');
        } else {
          showToast('Profile updated successfully!', 'success');
        }

        const updatedEmailVerified = result.data !== undefined ? result.data.emailVerified : userDetails.emailVerified;
        dispatch(
          setUserDetails({
            ...userDetails,
            name: profileData.fullName,
            username: profileData.username,
            email: isEmailChanged ? profileData.email : (userDetails.email ?? profileData.email),
            emailVerified: updatedEmailVerified,
          })
        );

        setIsEditingProfile(false);
        setHasProfileChanges(false);
        setProfileData((prev) => ({
          ...prev,
          verificationCode: '',
          email: result.data?.email ?? prev.email,
        }));

        if (result.data) {
          getUserDetails().then((freshUser) => {
            if (freshUser) {
              dispatch(setUserDetails(freshUser));
            }
          });
        }
      } else {

        const errorMessage = result.error || result.message || 'Failed to update profile';
        showToast(errorMessage, 'error');
        console.error('Profile update failed:', result);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showToast('Network error: Unable to update profile. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    const emailTarget = pendingEmailChange || (isEditingProfile && profileData.email !== user?.email ? profileData.email : null) || user?.email;
    if (!emailTarget) {
      showToast('Please enter an email address first', 'error');
      return;
    }
    if (isEditingProfile && profileData.email !== user?.email) {
      const emailError = validateEmail(profileData.email);
      if (emailError) {
        showToast(emailError, 'error');
        return;
      }
    }
    setIsSendingVerificationCode(true);
    try {
      const response = await fetch('/api/user/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailTarget }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast(`Verification code sent to ${emailTarget}!`, 'success');
      } else {
        showToast(
          result.error || result.message || 'Failed to send verification email',
          'error'
        );
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      showToast('Error sending verification email', 'error');
    } finally {
      setIsSendingVerificationCode(false);
    }
  };

  const handleProfileImageSelected = async (fileUrl: string) => {
    const user = userDetails || currentUser;
    try {
      if (user?.image?.trim()) {
        try {
          await fetch('/api/admin/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagePath: user.image }),
          });
        } catch {
        }
      }

      const response = await fetch('/api/user/set-profile-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: fileUrl }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const newImageUrl = result.data.image;
        const urlsToPurge = [newImageUrl].filter(Boolean);
        if (user?.image?.trim() && user.image !== newImageUrl) {
          urlsToPurge.push(user.image);
        }
        try {
          await fetch('/api/user/purge-profile-image-cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urlsToPurge }),
          });
        } catch {
        }

        const updatedUserDetails = {
          ...userDetails,
          image: newImageUrl,
          ...(result.data.updatedAt != null && { updatedAt: result.data.updatedAt }),
        };
        dispatch(setUserDetails(updatedUserDetails));

        try {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: newImageUrl }),
          });
        } catch {
        }

        showToast('Profile picture updated successfully!', 'success');

        setTimeout(async () => {
          try {
            const updatedUserData = await getUserDetails();
            if (updatedUserData) {
              dispatch(setUserDetails(updatedUserData));
              window.dispatchEvent(new CustomEvent('avatarUpdated'));
            }
          } catch {
          }
        }, 500);
      } else {
        showToast(result.error || 'Failed to update profile picture', 'error');
      }
    } catch (error) {
      console.error('Profile image update error:', error);
      showToast('Error updating profile picture', 'error');
    }
  };

  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
  };

  const validateFullName = (name: string): string | null => {
    if (!name.trim()) return 'Full name is required';
    if (name.trim().length < 2) return 'Full name must be at least 2 characters';
    return null;
  };

  const validateUsername = (username: string): string | null => {
    if (!username.trim()) return 'Username is required';
    if (username.trim().length < 3) return 'Username must be at least 3 characters';
    if (username.trim().length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) return 'Username can only contain letters, numbers, and underscores';
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
    if (!confirmPassword) return 'Please confirm your password';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const validateProfileField = (field: string, value: string) => {
    let error: string | null = null;

    if (field === 'fullName') {
      error = validateFullName(value);
    } else if (field === 'email') {
      error = validateEmail(value);
    } else if (field === 'username') {
      error = validateUsername(value);
    }

    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));

    return error === null;
  };

  const validatePasswordField = (field: string, value: string) => {
    let error: string | null = null;

    if (field === 'currentPass') {
      error = value ? null : 'Current password is required';
    } else if (field === 'newPass') {
      error = validatePassword(value);
    } else if (field === 'confirmNewPass') {
      error = validateConfirmPassword(formData.newPass, value);
    }

    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));

    const isValid = !error &&
      !!formData.currentPass &&
      !!formData.newPass &&
      !!formData.confirmNewPass &&
      formData.newPass === formData.confirmNewPass;

    setIsFormValid(isValid);

    return error === null;
  };

  return {
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
  };
}
