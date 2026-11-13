'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { IconType } from 'react-icons';
import {
  FaBell,
  FaCode,
  FaCreditCard,
  FaDollarSign,
  FaEnvelope,
  FaFileAlt,
  FaHandshake,
  FaHeadset,
  FaPuzzlePiece,
  FaSearch,
  FaSlidersH,
  FaTicketAlt,
  FaUsers,
  FaPlug,
} from 'react-icons/fa';

export const GENERAL_SECTIONS = ['general', 'seo', 'users', 'tickets', 'contact', 'modules'] as const;
export type GeneralSection = (typeof GENERAL_SECTIONS)[number];

interface SettingsTab {
  label: string;
  href: string;
  icon: IconType;
  /** Section of the general settings page, selected with ?tab= */
  section?: GeneralSection;
}

const BASE = '/admin/settings';

const TABS: SettingsTab[] = [
  { label: 'General', href: BASE, icon: FaSlidersH, section: 'general' },
  { label: 'SEO', href: `${BASE}?tab=seo`, icon: FaSearch, section: 'seo' },
  { label: 'Users', href: `${BASE}?tab=users`, icon: FaUsers, section: 'users' },
  { label: 'Tickets', href: `${BASE}?tab=tickets`, icon: FaTicketAlt, section: 'tickets' },
  { label: 'Contact Info', href: `${BASE}?tab=contact`, icon: FaHeadset, section: 'contact' },
  { label: 'Modules', href: `${BASE}?tab=modules`, icon: FaPuzzlePiece, section: 'modules' },
  { label: 'Providers', href: `${BASE}/providers`, icon: FaHandshake },
  { label: 'Payment Gateway', href: `${BASE}/payment-gateway`, icon: FaCreditCard },
  { label: 'Currency', href: `${BASE}/currency`, icon: FaDollarSign },
  { label: 'Notifications', href: `${BASE}/notifications`, icon: FaBell },
  { label: 'Mail', href: `${BASE}/email`, icon: FaEnvelope },
  { label: 'Email Templates', href: `${BASE}/email/templates`, icon: FaFileAlt },
  { label: 'Integrations', href: `${BASE}/integrations`, icon: FaPlug },
  { label: 'Custom Codes', href: `${BASE}/custom-codes`, icon: FaCode },
];

export function normalizeGeneralSection(value: string | null | undefined): GeneralSection {
  return (GENERAL_SECTIONS as readonly string[]).includes(value || '') ? (value as GeneralSection) : 'general';
}

// Settings sub-navigation: every settings page is a tab of one "Settings" screen.
export default function SettingsTabs() {
  const pathname = usePathname() || '';
  const section = normalizeGeneralSection(useSearchParams()?.get('tab'));
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  const isActive = (tab: SettingsTab) => {
    if (tab.section) return pathname === BASE && tab.section === section;
    const path = tab.href;
    if (pathname === path) return true;
    if (!pathname.startsWith(path + '/')) return false;
    // A deeper tab (Email Templates under Mail) wins over its parent.
    return !TABS.some((other) => other !== tab && !other.section && other.href.startsWith(path + '/') && pathname.startsWith(other.href));
  };

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname, section]);

  return (
    <div className="settings-shell-head">
      <h1 className="settings-title">Settings</h1>
      <nav className="settings-tabs" aria-label="Settings sections">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={active ? activeRef : undefined}
              className={`settings-tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon aria-hidden />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
