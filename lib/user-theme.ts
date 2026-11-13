// The look of a panel's public site and user dashboard. Chosen by the panel
// admin in Settings > General; the admin area itself always uses the default.
export const USER_THEMES = [
  { id: 'default', name: 'Default', description: 'Light and dark, purple accent.' },
  { id: 'carbon', name: 'Carbon', description: 'Dark, compact, orange accent.' },
] as const;

export type UserTheme = (typeof USER_THEMES)[number]['id'];

export function normalizeUserTheme(value: unknown): UserTheme {
  return USER_THEMES.some((theme) => theme.id === value) ? (value as UserTheme) : 'default';
}
