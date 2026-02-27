export const PROFILE_IMAGE_CACHE_MAX_AGE_SECONDS = 31536000;

export function getCachedProfileImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  return trimmed || '';
}
