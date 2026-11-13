import { NextRequest, NextResponse } from 'next/server';
import {
  handleTelegramUpdate,
  isTelegramConnected,
  TelegramUpdate,
} from '@/lib/telegram';
import { GET as checkQuakesGET } from '@/app/api/quakes/route';
import { readStore } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    if (!isTelegramConnected()) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'bot_disconnected',
      });
    }

    const update = (await req.json()) as TelegramUpdate;
    await handleTelegramUpdate(update);

    // Opportunistically check seismic activity if last check was > 2 minutes ago
    const store = readStore();
    const lastCheck = store.quakeConfig.lastCheckedAt
      ? new Date(store.quakeConfig.lastCheckedAt).getTime()
      : 0;
    if (Date.now() - lastCheck > 2 * 60 * 1000) {
      await checkQuakesGET().catch(() => null);
    }

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

