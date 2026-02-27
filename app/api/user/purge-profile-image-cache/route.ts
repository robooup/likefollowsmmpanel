import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const urls = Array.isArray(body.urls)
      ? body.urls
      : typeof body.imageUrl === 'string'
        ? [body.imageUrl]
        : [];

    const validUrls = urls.filter((u: unknown) => typeof u === 'string' && u.trim().length > 0);

    if (validUrls.length > 0) {
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Purge profile image cache error:', error);
    return NextResponse.json(
      { error: 'Failed to purge cache', success: false },
      { status: 500 }
    );
  }
}
