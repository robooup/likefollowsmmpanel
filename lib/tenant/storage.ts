import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { requireTenant } from './current';

// Per-panel file storage. Every panel gets its own directory outside `public/`
// so one panel can never read, list, overwrite or delete another panel's files
// (or the application's own files). Files are served by /api/files/[...path].

export const FILE_URL_PREFIX = '/api/files';

/** Only these extensions can be stored or served. No html / svg / js. */
export const SAFE_FILE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
};

const INLINE_TYPES = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.bmp', '.pdf', '.mp4', '.mp3']);
const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._ ()-]{0,120}$/;

export class StorageError extends Error {}

function storageRoot(): string {
  return path.resolve(process.env.STORAGE_DIR || path.join(process.cwd(), 'storage'));
}

async function tenantRoot(): Promise<string> {
  const tenant = await requireTenant();
  return path.join(storageRoot(), 'panels', String(tenant.id));
}

/** Validate a relative key like "uploads/abc.png" and return its clean segments. */
export function cleanKey(key: string, opts: { file?: boolean } = {}): string[] {
  const segments = String(key || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((s) => s.length > 0);
  if (segments.length > 6) throw new StorageError('Path is too deep');
  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !SEGMENT_RE.test(segment) || segment.endsWith('.')) {
      throw new StorageError('Invalid file path');
    }
  }
  if (opts.file) {
    if (segments.length === 0) throw new StorageError('Invalid file path');
    const ext = path.extname(segments[segments.length - 1]).toLowerCase();
    if (!SAFE_FILE_TYPES[ext]) throw new StorageError('This file type is not allowed');
  }
  return segments;
}

async function resolveKey(key: string, opts: { file?: boolean } = {}): Promise<{ full: string; segments: string[] }> {
  const segments = cleanKey(key, opts);
  const root = await tenantRoot();
  const full = path.resolve(root, ...segments);
  if (full !== root && !full.startsWith(root + path.sep)) throw new StorageError('Invalid file path');
  return { full, segments };
}

export function fileUrl(key: string): string {
  return `${FILE_URL_PREFIX}/${cleanKey(key).map(encodeURIComponent).join('/')}`;
}

/** "/api/files/uploads/a.png" (or a full URL to it) -> "uploads/a.png"; null if not a panel file URL. */
export function keyFromFileUrl(url: string): string | null {
  let pathname = String(url || '');
  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }
  pathname = pathname.split('?')[0];
  if (!pathname.startsWith(`${FILE_URL_PREFIX}/`)) return null;
  try {
    return decodeURIComponent(pathname.slice(FILE_URL_PREFIX.length + 1));
  } catch {
    return null;
  }
}

export async function saveTenantFile(key: string, body: Buffer | Uint8Array): Promise<{ key: string; url: string }> {
  const { full, segments } = await resolveKey(key, { file: true });
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
  const clean = segments.join('/');
  return { key: clean, url: fileUrl(clean) };
}

export async function ensureTenantDir(key: string): Promise<void> {
  const { full } = await resolveKey(key);
  await mkdir(full, { recursive: true });
}

export async function deleteTenantFile(key: string): Promise<boolean> {
  const { full } = await resolveKey(key, { file: true });
  try {
    await unlink(full);
    return true;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export async function readTenantFile(
  key: string
): Promise<{ body: Buffer; contentType: string; inline: boolean; name: string } | null> {
  const { full, segments } = await resolveKey(key, { file: true });
  try {
    const info = await stat(full);
    if (!info.isFile()) return null;
    const name = segments[segments.length - 1];
    const ext = path.extname(name).toLowerCase();
    return { body: await readFile(full), contentType: SAFE_FILE_TYPES[ext], inline: INLINE_TYPES.has(ext), name };
  } catch (error: any) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return null;
    throw error;
  }
}

export type TenantMediaItem =
  | { type: 'folder'; path: string; name: string }
  | { type: 'file'; url: string; name: string; path: string; size: number; mimeType: string };

export async function listTenantFiles(prefix: string): Promise<TenantMediaItem[]> {
  const { full, segments } = await resolveKey(prefix);
  const base = segments.join('/');
  const items: TenantMediaItem[] = [];
  let entries;
  try {
    entries = await readdir(full, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return items;
    throw error;
  }
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      items.push({ type: 'folder', path: rel, name: entry.name });
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!SAFE_FILE_TYPES[ext]) continue;
      const info = await stat(path.join(full, entry.name));
      items.push({
        type: 'file',
        url: `${FILE_URL_PREFIX}/${rel.split('/').map(encodeURIComponent).join('/')}`,
        name: entry.name,
        path: rel,
        size: info.size,
        mimeType: SAFE_FILE_TYPES[ext].split(';')[0],
      });
    }
  }
  return items;
}
