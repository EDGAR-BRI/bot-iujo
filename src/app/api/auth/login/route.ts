import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  getAdminCredentials,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');

    const { validUsers, password: expectedPassword } = getAdminCredentials();

    if (!validUsers.includes(username) || password !== expectedPassword) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Usuario o contraseña incorrectos. Verifica tus credenciales.',
        },
        { status: 401 }
      );
    }

    const token = await createSessionToken(username);
    const res = NextResponse.json({
      ok: true,
      username,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Error procesando el inicio de sesión.' },
      { status: 500 }
    );
  }
}

