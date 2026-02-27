import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db');
    const settings = await db.generalSettings.findFirst({
      select: {
        siteIcon: true,
      },
    });

    const siteIcon = (settings?.siteIcon ?? '').trim();

    if (siteIcon !== '') {
      if (siteIcon.startsWith('http://') || siteIcon.startsWith('https://')) {
        const res = NextResponse.redirect(siteIcon, 302);
        res.headers.set('Cache-Control', 'no-store, max-age=0');
        return res;
      }

      const iconPathRelative = siteIcon.startsWith('/')
        ? siteIcon.substring(1)
        : siteIcon;
      const iconPath = path.join(process.cwd(), 'public', iconPathRelative);

      try {
        if (fs.existsSync(iconPath)) {
          const fileBuffer = fs.readFileSync(iconPath);
          const fileExtension = path.extname(siteIcon).toLowerCase();

          let contentType = 'image/x-icon';
          switch (fileExtension) {
            case '.png':
              contentType = 'image/png';
              break;
            case '.jpg':
            case '.jpeg':
              contentType = 'image/jpeg';
              break;
            case '.gif':
              contentType = 'image/gif';
              break;
            case '.svg':
              contentType = 'image/svg+xml';
              break;
            case '.ico':
              contentType = 'image/x-icon';
              break;
            default:
              contentType = 'image/png';
          }

          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'no-store, max-age=0',
            },
          });
        }
      } catch (fileError) {
        console.error(`Error reading favicon file at ${iconPath}:`, fileError);
      }
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error('Error serving favicon:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
