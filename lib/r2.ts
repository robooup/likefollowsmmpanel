// Historically this module talked to a Cloudflare R2 bucket shared by the
// whole install. In the multi-tenant SaaS every panel gets its own private
// storage directory instead (see lib/tenant/storage.ts); the function names
// are kept so existing callers keep working.
import {
  deleteTenantFile,
  ensureTenantDir,
  fileUrl,
  listTenantFiles,
  saveTenantFile,
  type TenantMediaItem,
} from '@/lib/tenant/storage';

export function isR2Configured(): boolean {
  return true;
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType?: string;
}): Promise<{ key: string; url: string }> {
  return saveTenantFile(params.key, params.body);
}

export async function ensureR2Path(prefix: string): Promise<void> {
  await ensureTenantDir(prefix);
}

export async function deleteFromR2(key: string): Promise<void> {
  await deleteTenantFile(key);
}

export function getR2PublicUrl(key: string): string {
  return fileUrl(key);
}

export type R2MediaItem = TenantMediaItem;

export async function listR2Objects(prefix: string): Promise<R2MediaItem[]> {
  return listTenantFiles(prefix);
}
