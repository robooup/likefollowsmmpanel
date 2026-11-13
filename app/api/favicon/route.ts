import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { keyFromFileUrl, readTenantFile, SAFE_FILE_TYPES } from '@/lib/tenant/storage';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const { db } = await import('@/lib/db');
    const settings = await db.generalSettings.findFirst({ select: { siteIcon: true } });
    const siteIcon = (settings?.siteIcon ?? '').trim();
    if (siteIcon === '') return new NextResponse(null, { status: 404 });

    // 1) A file uploaded to this panel's own storage.
    const key = keyFromFileUrl(siteIcon);
    if (key) {
      const file = await readTenantFile(key).catch(() => null);
      if (!file || !file.contentType.startsWith('image/')) return new NextResponse(null, { status: 404 });
      return new NextResponse(new Uint8Array(file.body), {
        headers: { 'Content-Type': file.contentType, 'X-Content-Type-Options': 'nosniff', ...NO_STORE },
      });
    }

    // 2) An external image URL.
    if (/^https?:\/\//i.test(siteIcon)) {
      if (!isSafeHttpUrl(siteIcon)) return new NextResponse(null, { status: 404 });
      return NextResponse.redirect(siteIcon, { status: 302, headers: NO_STORE });
    }

    // 3) One of the stock images shipped in public/general — nothing else on disk.
    const name = path.basename(siteIcon.replace(/\\/g, '/'));
    const ext = path.extname(name).toLowerCase();
    const type = SAFE_FILE_TYPES[ext];
    if (!type || !type.startsWith('image/') || !/^[\w.-]+$/.test(name)) {
      return new NextResponse(null, { status: 404 });
    }
    try {
      const body = await readFile(path.join(process.cwd(), 'public', 'general', name));
      return new NextResponse(new Uint8Array(body), { headers: { 'Content-Type': type, ...NO_STORE } });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  } catch (error) {
    console.error('Error serving favicon:', error);
    return new NextResponse(null, { status: 404 });
  }
}
