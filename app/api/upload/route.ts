import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { isR2Configured, ensureR2Path, uploadToR2 } from '@/lib/r2';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.formData();
    const files = data.getAll('files') as File[];
    const singleFile = data.get('file') as File;
    const uploadType = data.get('uploadType') as string || data.get('type') as string;

    const filesToProcess = files.length > 0 ? files : (singleFile ? [singleFile] : []);
    
    if (filesToProcess.length === 0) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    let allowedTypes: string[];
    let maxSize: number;
    
    if (uploadType === 'uploads' || uploadType === 'support_ticket_uploads') {
      allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf'
      ];
      maxSize = 3 * 1024 * 1024;
    } else if (uploadType === 'admin_uploads' || uploadType === 'admin_media') {
      allowedTypes = [];
      maxSize = 50 * 1024 * 1024;
    } else {
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      maxSize = 5 * 1024 * 1024;
    }

    let uploadSubDir = uploadType === 'support_ticket_uploads' ? 'support-tickets' : 'uploads';
    if (uploadType === 'general' || uploadType === 'admin_media') {
      uploadSubDir = 'general';
    } else if (uploadType === 'uploads' && data.get('uploadPath') === 'blog-img') {
      uploadSubDir = 'blog-img';
    } else if (uploadType === 'admin_uploads') {
      const uploadPath = data.get('uploadPath') as string | null;
      if (uploadPath !== undefined && uploadPath !== null && typeof uploadPath === 'string') {
        const normalized = uploadPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        if (!normalized.includes('..') && !path.isAbsolute(normalized)) {
          const publicDir = path.resolve(process.cwd(), 'public');
          const targetDir = normalized ? path.resolve(publicDir, normalized) : publicDir;
          if (targetDir.startsWith(publicDir)) {
            uploadSubDir = normalized;
          }
        }
      }
    }

    if (uploadSubDir === '' && uploadType === 'admin_uploads') {
      maxSize = 1 * 1024 * 1024;
    }
    if (uploadType === 'admin_media') {
      maxSize = 50 * 1024 * 1024;
    }

    const useR2 = isR2Configured();
    const uploadsDir = path.join(process.cwd(), 'public', uploadSubDir);
    if (!useR2) {
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (error) {
      }
    }

    if (useR2 && uploadSubDir) {
      await ensureR2Path(uploadSubDir);
    }

    const uploadedFiles = [];
    
    for (const file of filesToProcess) {
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type for ${file.name}. Only ${(uploadType === 'uploads') ? 'images and PDF files' : 'images'} are allowed.` },
          { status: 400 }
        );
      }

      if (file.size > maxSize) {
        const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum ${maxSizeMB}MB allowed.` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileExtension = path.extname(file.name);
      const randomBytes = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now().toString();
      const hash = crypto.createHash('sha256').update(`${file.name}${timestamp}${randomBytes}`).digest('hex');
      const encryptedFilename = `${hash.substring(0, 16)}${fileExtension}`;

      const useOriginalName = uploadSubDir === 'general';
      const storedFilename = useOriginalName
        ? (path.basename(file.name).replace(/\\/g, '/').trim() || encryptedFilename)
        : encryptedFilename;

      let fileUrl: string;
      if (useR2) {
        const r2Key = uploadSubDir ? `${uploadSubDir}/${storedFilename}` : storedFilename;
        const { url } = await uploadToR2({
          key: r2Key,
          body: buffer,
          contentType: file.type || undefined,
        });
        fileUrl = url;
      } else {
        const filepath = path.join(uploadsDir, storedFilename);
        await writeFile(filepath, buffer);
        fileUrl = uploadSubDir ? `/${uploadSubDir}/${storedFilename}` : `/${storedFilename}`;
      }

      uploadedFiles.push({
        originalName: file.name,
        encryptedName: storedFilename,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type
      });
    }

    if (filesToProcess.length === 1) {
      const fileInfo = uploadedFiles[0];
      return NextResponse.json({
        success: true,
        fileUrl: fileInfo.fileUrl,
        filePath: fileInfo.fileUrl,
        originalName: fileInfo.originalName,
        encryptedName: fileInfo.encryptedName,
        fileSize: fileInfo.fileSize,
        mimeType: fileInfo.mimeType,
        message: 'File uploaded successfully'
      });
    } else {
      return NextResponse.json({
        success: true,
        files: uploadedFiles,
        filePaths: uploadedFiles.map(f => f.fileUrl),
        message: `${uploadedFiles.length} files uploaded successfully`
      });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error uploading file:', error);
    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? `Failed to upload file: ${message}`
        : 'Failed to upload file';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
