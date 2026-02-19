import { NextRequest, NextResponse } from 'next/server'

/** Redirect old /api/ref/[code] links to cleaner /ref/[code] for backward compatibility */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const baseUrl = new URL('/', request.url)
  return NextResponse.redirect(new URL(`/ref/${code || ''}`, baseUrl))
}

