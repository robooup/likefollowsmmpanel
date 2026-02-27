import { auth } from '@/auth';
import { isR2Configured, deleteFromR2 } from '@/lib/r2';
import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imagePath } = body;

    if (!imagePath || typeof imagePath !== 'string') {
      return NextResponse.json({ error: 'Image path is required' }, { status: 400 });
    }

    const imagePathRelative = imagePath.startsWith('/')
      ? imagePath.substring(1)
      : imagePath;

    if (isR2Configured()) {
      let r2Key: string;
      const publicUrl = process.env.R2_PUBLIC_URL ?? '';
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        if (!publicUrl || !imagePath.startsWith(publicUrl)) {
          return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
        }
        r2Key = imagePath.slice(publicUrl.replace(/\/$/, '').length).replace(/^\//, '');
      } else {
        r2Key = imagePathRelative;
      }
      if (!r2Key || r2Key.includes('..')) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
      }
      try {
        await deleteFromR2(r2Key);
        return NextResponse.json({
          success: true,
          message: 'File deleted successfully',
        });
      } catch (error: unknown) {
        console.error('Error deleting file from R2:', error);
        return NextResponse.json(
          { error: 'Failed to delete file', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    const filePath = path.join(process.cwd(), 'public', imagePathRelative);
    const publicDir = path.join(process.cwd(), 'public');
    const resolvedPath = path.resolve(filePath);
    const resolvedPublicDir = path.resolve(publicDir);

    if (!resolvedPath.startsWith(resolvedPublicDir)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: true,
        message: 'File not found (may have been already deleted)',
      });
    }

    try {
      await unlink(filePath);
      return NextResponse.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error: unknown) {
      console.error('Error deleting file:', error);
      return NextResponse.json(
        { error: 'Failed to delete file', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Error in delete-image route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

