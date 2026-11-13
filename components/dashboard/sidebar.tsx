'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Session } from 'next-auth';

const Image = dynamic(() => import('next/image'), { ssr: false });
const Link = dynamic(() => import('next/link'), { ssr: false });

import SideBarNav, { SidebarFooter } from './sidebar-nav';

interface SideBarProps {
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  session?: Session | null;
}

function SideBarContent({
  collapsed,
  setCollapsed,
  session,
}: {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  session: Session | null | undefined;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [siteIcon, setSiteIcon] = useState<string>('');
  const [sidebarLogo, setSidebarLogo] = useState<string>('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (session?.user) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(true);
    }
  }, [session]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/public/general-settings', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.generalSettings) {
            if (data.generalSettings.siteIcon) {
              const icon = String(data.generalSettings.siteIcon).trim();
              setSiteIcon(icon);
            }
            if (data.generalSettings.siteDarkLogo) {
              const darkLogo = String(data.generalSettings.siteDarkLogo).trim();
              setSidebarLogo(darkLogo);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch general settings for sidebar icon:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };
    fetchSettings();
  }, []);

  const showSkeleton = isLoading || !session?.user;

  return (
    <div
      className={`h-full bg-slate-800 text-white transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[80px]' : 'w-[280px]'
      } overflow-hidden`}
    >
      <div
        className={`sidebar-header ${
          collapsed ? 'p-4 flex-col space-y-3' : 'p-4'
        } flex items-center border-b border-slate-700/50`}
      >
        {collapsed ? (
          <>
            {showSkeleton ? (
              <div className="w-[50px] h-[50px] rounded bg-slate-700/50 animate-pulse"></div>
            ) : settingsLoaded && siteIcon ? (
              <Link href="/">
                <Image
                  src={siteIcon}
                  alt="Site Icon"
                  width={50}
                  height={50}
                  className="object-contain cursor-pointer hover:opacity-80 transition-opacity duration-200"
                  priority={true}
                />
              </Link>
            ) : null}
            <button
              className="p-2 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] shadow-lg w-10 h-10 flex items-center justify-center text-white rounded-md transition-all duration-300"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Expand sidebar"
            >
              <i className="ri-menu-unfold-line text-lg transition-all duration-300"></i>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center w-full">
              <div className="logo-container w-full flex items-center">
                {showSkeleton ? (
                  <div className="w-full h-[40px] bg-slate-700/50 animate-pulse rounded"></div>
                ) : session?.user?.role === 'admin' ? (
                  <Link href="/">
                    <Image
                      src="/general/logo-dark.png"
                      alt="Logo"
                      width={280}
                      height={60}
                      className="object-cover w-full h-[40px] cursor-pointer hover:opacity-80 transition-opacity duration-200"
                      priority={true}
                    />
                  </Link>
                ) : settingsLoaded && sidebarLogo ? (
                  <Link href="/">
                    <Image
                      src={sidebarLogo}
                      alt="Site Dark Logo"
                      width={280}
                      height={60}
                      className="object-contain w-full h-[40px] cursor-pointer hover:opacity-80 transition-opacity duration-200"
                      priority={true}
                    />
                  </Link>
                ) : null}
              </div>
            </div>
            <button
              className="ml-auto p-2 hover:bg-slate-700 text-white rounded-md transition-all duration-300"
              onClick={() => setCollapsed(!collapsed)}
              aria-label="Collapse sidebar"
            >
              <i className="ri-menu-fold-line text-xl transition-all duration-300"></i>
            </button>
          </>
        )}
      </div>
      <div className="sidebar-nav overflow-y-auto overflow-x-hidden flex-1">
        <SideBarNav collapsed={collapsed} session={session} setOpen={() => {}} />
      </div>
      <SidebarFooter collapsed={collapsed} session={session} setOpenAction={() => {}} />
    </div>
  );
}

export default function SideBar({
  collapsed: externalCollapsed,
  setCollapsed: setExternalCollapsed,
  session,
}: SideBarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed =
    externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const setCollapsed = (value: boolean) => {
    setInternalCollapsed(value);
    if (setExternalCollapsed) {
      setExternalCollapsed(value);
    }
  };

  return (
    <SideBarContent
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      session={session}
    />
  );
}
