import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import crypto from 'crypto';
import { cleanKey, SAFE_FILE_TYPES, saveTenantFile, StorageError } from '@/lib/tenant/storage';

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

    const role = session.user.role;
    const isStaff = role === 'admin' || role === 'moderator';
    const isAdminUpload =
      uploadType === 'admin_uploads' || uploadType === 'admin_media' || uploadType === 'general';
    if (isAdminUpload && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    let allowedTypes: string[];
    let maxSize: number;

    if (uploadType === 'uploads' || uploadType === 'support_ticket_uploads') {
      allowedTypes = [...imageTypes, 'application/pdf'];
      maxSize = 3 * 1024 * 1024;
    } else if (uploadType === 'admin_uploads' || uploadType === 'admin_media') {
      allowedTypes = []; // any type on the storage allow-list (checked by extension below)
      maxSize = 20 * 1024 * 1024;
    } else {
      allowedTypes = imageTypes;
      maxSize = 5 * 1024 * 1024;
    }

    let uploadSubDir = uploadType === 'support_ticket_uploads' ? 'support-tickets' : 'uploads';
    if (uploadType === 'general' || uploadType === 'admin_media') {
      uploadSubDir = 'general';
    } else if (uploadType === 'uploads' && data.get('uploadPath') === 'blog-img') {
      uploadSubDir = 'blog-img';
    } else if (uploadType === 'admin_uploads') {
      const uploadPath = data.get('uploadPath');
      if (typeof uploadPath === 'string' && uploadPath.trim() !== '') {
        try {
          uploadSubDir = cleanKey(uploadPath).join('/') || 'uploads';
        } catch {
          return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 });
        }
      }
    }

    const uploadedFiles = [];

    for (const file of filesToProcess) {
      const fileExtension = path.extname(file.name).toLowerCase();
      const storedType = SAFE_FILE_TYPES[fileExtension];
      if (!storedType) {
        return NextResponse.json(
          { error: `File type of ${file.name} is not allowed.` },
          { status: 400 }
        );
      }
      // Trust the extension we will serve the file as, not the browser-declared type.
      const effectiveType = storedType.split(';')[0];
      if (allowedTypes.length > 0 && !allowedTypes.includes(effectiveType)) {
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

      const randomBytes = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now().toString();
      const hash = crypto.createHash('sha256').update(`${file.name}${timestamp}${randomBytes}`).digest('hex');
      const encryptedFilename = `${hash.substring(0, 16)}${fileExtension}`;

      const useOriginalName = uploadSubDir === 'general';
      const originalBase = path
        .basename(file.name.replace(/\\/g, '/'), path.extname(file.name))
        .replace(/[^A-Za-z0-9._ ()-]/g, '-')
        .replace(/^[^A-Za-z0-9]+/, '')
        .slice(0, 80);
      const storedFilename = useOriginalName && originalBase ? `${originalBase}${fileExtension}` : encryptedFilename;

      const { url: fileUrl } = await saveTenantFile(`${uploadSubDir}/${storedFilename}`, buffer);

      uploadedFiles.push({
        originalName: file.name,
        encryptedName: storedFilename,
        fileUrl,
        fileSize: file.size,
        mimeType: effectiveType
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
    if (error instanceof StorageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error uploading file:', error);
    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? `Failed to upload file: ${message}`
        : 'Failed to upload file';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
