import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL;

export function isR2Configured(): boolean {
  return Boolean(
    accountId && accessKeyId && secretAccessKey && bucketName && publicUrl
  );
}

let r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL.');
  }
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }
  return r2Client;
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType?: string;
}): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName!,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
  if (!publicUrl) throw new Error('R2_PUBLIC_URL is not set');
  const baseUrl = publicUrl.replace(/\/$/, '');
  const key = params.key.startsWith('/') ? params.key.slice(1) : params.key;
  const url = `${baseUrl}/${key}`;
  return { key: params.key, url };
}

export async function ensureR2Path(prefix: string): Promise<void> {
  const client = getR2Client();
  const key = prefix.endsWith('/') ? prefix : `${prefix}/`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName!,
      Key: key,
      Body: Buffer.alloc(0),
    })
  );
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName!,
      Key: key,
    })
  );
}

export function getR2PublicUrl(key: string): string {
  if (!publicUrl) throw new Error('R2_PUBLIC_URL is not set');
  const baseUrl = publicUrl.replace(/\/$/, '');
  const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
  return `${baseUrl}/${normalizedKey}`;
}

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.ico': 'image/x-icon',
  '.bmp': 'image/bmp', '.tiff': 'image/tiff', '.tif': 'image/tiff', '.zip': 'application/zip',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
};

export type R2MediaItem =
  | { type: 'folder'; path: string; name: string }
  | { type: 'file'; url: string; name: string; path: string; size: number; mimeType: string };

export async function listR2Objects(prefix: string): Promise<R2MediaItem[]> {
  const client = getR2Client();
  const normalizedPrefix = prefix ? (prefix.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') + '/') : '';
  const items: R2MediaItem[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName!,
        Prefix: normalizedPrefix,
        Delimiter: '/',
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    if (response.CommonPrefixes) {
      for (const cp of response.CommonPrefixes) {
        const p = (cp.Prefix ?? '').replace(/\/$/, '');
        const name = p.split('/').filter(Boolean).pop() ?? p;
        items.push({ type: 'folder', path: p, name: name || '/' });
      }
    }
    if (response.Contents) {
      for (const obj of response.Contents) {
        const key = obj.Key ?? '';
        if (!key || key.endsWith('/')) continue;
        const name = key.split('/').pop() ?? key;
        const ext = name.includes('.') ? '.' + name.split('.').pop()!.toLowerCase() : '';
        items.push({
          type: 'file',
          url: getR2PublicUrl(key),
          name,
          path: key,
          size: obj.Size ?? 0,
          mimeType: MIME_BY_EXT[ext] ?? 'application/octet-stream',
        });
      }
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return items;
}
