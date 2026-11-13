'use client';

import React, { createContext, useContext } from 'react';
import type { UserTheme } from '@/lib/user-theme';

const UserThemeContext = createContext<UserTheme>('default');

export function UserThemeProvider({ theme, children }: { theme: UserTheme; children: React.ReactNode }) {
  return <UserThemeContext.Provider value={theme}>{children}</UserThemeContext.Provider>;
}

/** The theme in effect for this visitor ('default' for staff and inside the admin area). */
export function useUserTheme(): UserTheme {
  return useContext(UserThemeContext);
}
