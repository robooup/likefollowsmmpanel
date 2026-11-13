'use client';

import { useEffect } from 'react';
import { SETTINGS_INVALIDATED_EVENT } from '@/lib/settings-invalidation';

// Refreshes the favicon after the panel's icon changes.
//
// The <link> elements in <head> are rendered by the root layout, so React owns
// them. Removing them here made React throw ("Cannot read properties of null
// (reading 'removeChild')") the next time it committed a navigation, which
// left the page stuck until the link was clicked again. Only the href of the
// existing elements is changed; elements are created just when none exist.
function updateFaviconLinks() {
  if (typeof document === 'undefined' || !document.head) return;

  const faviconHref = `/api/favicon?t=${Date.now()}`;
  const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];

  for (const rel of rels) {
    const links = document.head.querySelectorAll<HTMLLinkElement>(`link[rel='${rel}']`);
    if (links.length > 0) {
      links.forEach((link) => {
        link.href = faviconHref;
      });
      continue;
    }
    const link = document.createElement('link');
    link.rel = rel;
    link.href = faviconHref;
    if (rel !== 'apple-touch-icon') link.type = 'image/png';
    link.setAttribute('data-favicon-updater', '');
    document.head.appendChild(link);
  }
}

export default function FaviconUpdater() {
  useEffect(() => {
    const timeoutId = setTimeout(() => {}, 0);

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

