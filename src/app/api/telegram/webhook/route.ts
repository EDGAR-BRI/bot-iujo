import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramUpdate, TelegramUpdate } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json()) as TelegramUpdate;
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Webhook error',
      },
      { status: 500 }
    );
  }
}

