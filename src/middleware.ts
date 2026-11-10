import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public endpoints (Telegram webhook, Vercel cron, Auth endpoints, static assets)
  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/telegram/webhook') ||
    pathname.startsWith('/api/quakes/check') ||
    pathname.startsWith('/_next/') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (pathname === '/login') {
    if (session.valid) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    if (!session.valid) {
      return NextResponse.json(
        { ok: false, error: 'No autorizado. Inicia sesión nuevamente.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Protect main dashboard page
  if (!session.valid) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/api/:path*'],
};

