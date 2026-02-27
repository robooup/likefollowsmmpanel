'use client';

import { useEffect } from 'react';
import { SETTINGS_INVALIDATED_EVENT } from '@/lib/settings-invalidation';

function updateFaviconLinks() {
  if (typeof document === 'undefined' || !document.head) return;

  const timestamp = Date.now();
  const faviconHref = `/api/favicon?t=${timestamp}`;

  const existingLinks = document.querySelectorAll(
    "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
  );
  existingLinks.forEach((link) => {
    try {
      if (link.parentNode && document.head.contains(link)) {
        link.remove();
      }
    } catch {
    }
  });

  const faviconLink = document.createElement('link');
  faviconLink.rel = 'icon';
  faviconLink.href = faviconHref;
  faviconLink.type = 'image/png';
  document.head.appendChild(faviconLink);

  const shortcutLink = document.createElement('link');
  shortcutLink.rel = 'shortcut icon';
  shortcutLink.href = faviconHref;
  shortcutLink.type = 'image/png';
  document.head.appendChild(shortcutLink);

  const appleLink = document.createElement('link');
  appleLink.rel = 'apple-touch-icon';
  appleLink.href = faviconHref;
  document.head.appendChild(appleLink);
}

export default function FaviconUpdater() {
  useEffect(() => {
    updateFaviconLinks();
    const timeoutId = setTimeout(updateFaviconLinks, 100);

    const handleSettingsInvalidated = () => {
      updateFaviconLinks();
    };
    window.addEventListener(SETTINGS_INVALIDATED_EVENT, handleSettingsInvalidated);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener(SETTINGS_INVALIDATED_EVENT, handleSettingsInvalidated);
    };
  }, []);

  return null;
}

