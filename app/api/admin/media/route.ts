import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';
import { cleanKey, listTenantFiles, StorageError, type TenantMediaItem } from '@/lib/tenant/storage';
import { NextResponse } from 'next/server';

type MediaItem = TenantMediaItem;

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role || 'user';
    const userPermissions = (session.user as { permissions?: string[] })?.permissions;
    const routePath = '/admin/media';

    if (!hasPermission(userRole, userPermissions, routePath)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pathParam = searchParams.get('path') || '';
    let mediaItems: MediaItem[];
    let normalizedPath: string;
    try {
      normalizedPath = cleanKey(pathParam).join('/');
      mediaItems = await listTenantFiles(normalizedPath);
    } catch (error) {
      if (error instanceof StorageError) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: mediaItems,
      path: normalizedPath,
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}
