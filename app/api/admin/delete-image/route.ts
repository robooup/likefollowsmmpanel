import { auth } from '@/auth';
import { deleteTenantFile, keyFromFileUrl, StorageError } from '@/lib/tenant/storage';
import { NextRequest, NextResponse } from 'next/server';

// Deletes a file from the current panel's own storage. Staff only.
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const isStaff = session.user.role === 'admin' || session.user.role === 'moderator';

    const body = await request.json();
    const { imagePath } = body;

    if (!imagePath || typeof imagePath !== 'string') {
      return NextResponse.json({ error: 'Image path is required' }, { status: 400 });
    }

    // Accept "/api/files/<key>" URLs as well as a bare storage key.
    const key = keyFromFileUrl(imagePath) ?? (/^https?:\/\//i.test(imagePath) ? null : imagePath.replace(/^\/+/, ''));
    if (!key) {
      // Stock images shipped with the app and external URLs are not deletable.
      return NextResponse.json({ success: true, message: 'Nothing to delete' });
    }

    // Regular users may only remove their own profile picture.
    const ownAvatar = new RegExp(`^avatars/avatar_${Number(session.user.id)}_\\d+\\.[a-z]+$`);
    if (!isStaff && !ownAvatar.test(key)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await deleteTenantFile(key);
    return NextResponse.json({
      success: true,
      message: deleted ? 'File deleted successfully' : 'File not found (may have been already deleted)',
    });
  } catch (error) {
    if (error instanceof StorageError) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
