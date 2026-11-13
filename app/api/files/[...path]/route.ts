import { NextRequest, NextResponse } from 'next/server';
import { readTenantFile, StorageError } from '@/lib/tenant/storage';

// Serves a file uploaded to the current panel's private storage.
export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const file = await readTenantFile(path.join('/'));
    if (!file) return new NextResponse('Not found', { status: 404 });

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        'Content-Type': file.contentType,
        'Content-Length': String(file.body.length),
        'Content-Disposition': `${file.inline ? 'inline' : 'attachment'}; filename="${file.name.replace(/[^\w.() -]/g, '_')}"`,
        'X-Content-Type-Options': 'nosniff',
        // Uploaded content must never run script in the panel's origin.
        'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox",
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    if (error instanceof StorageError) return new NextResponse('Not found', { status: 404 });
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
