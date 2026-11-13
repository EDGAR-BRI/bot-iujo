import { NextRequest, NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/store';
import { getBotStatus, telegramCall } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const store = readStore();
    return NextResponse.json({
      ok: true,
      connected: store.telegramConnected,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error leyendo estado de conexión',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const nextConnected = Boolean(body.connected);
    const releaseWebhook = Boolean(body.releaseWebhook);

    let webhookReleased = false;
    if (!nextConnected && releaseWebhook) {
      const delRes = await telegramCall('deleteWebhook', undefined, true).catch(() => ({
        ok: false,
      }));
      webhookReleased = Boolean(delRes.ok);
    }

    const store = readStore();
    store.telegramConnected = nextConnected;
    writeStore(store);

    const botStatus = await getBotStatus();

    return NextResponse.json({
      ok: true,
      connected: store.telegramConnected,
      webhookReleased,
      botStatus,
      message: nextConnected
        ? 'Bot conectado nuevamente a Telegram.'
        : webhookReleased
        ? 'Bot desconectado y Webhook liberado para pruebas en local.'
        : 'Bot desconectado manualmente de Telegram (modo sin conexión).',
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error actualizando conexión con Telegram',
      },
      { status: 500 }
    );
  }
}

