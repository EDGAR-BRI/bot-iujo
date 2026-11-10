import { NextResponse } from 'next/server';
import { GET as checkQuakesGET } from '../route';

export const dynamic = 'force-dynamic';

export async function GET() {
  const res = await checkQuakesGET();
  const data = await res.json();
  return NextResponse.json({
    cron: 'vercel-barquisimeto-seismic-monitor',
    ...data,
  });
}

