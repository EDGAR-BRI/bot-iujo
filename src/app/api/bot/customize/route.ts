import { NextRequest, NextResponse } from 'next/server';
import { customizeBotProfile, telegramCall } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'setWebhook') {
      const webhookUrl = String(body.webhookUrl || '').trim();
      if (!webhookUrl) {
        const delRes = await telegramCall('deleteWebhook');
        return NextResponse.json({
          ok: delRes.ok,
          message: 'Webhook eliminado. El bot ahora funciona por Polling automático.',
        });
      }
      const setRes = await telegramCall('setWebhook', {
        url: webhookUrl,
        allowed_updates: ['message'],
      });
      return NextResponse.json({
        ok: setRes.ok,
        description: setRes.description,
        message: setRes.ok
          ? `Webhook configurado en ${webhookUrl}`
          : `Error configurando Webhook: ${setRes.description}`,
      });
    }

    const result = await customizeBotProfile({
      name: body.name,
      shortDescription: body.shortDescription,
      description: body.description,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error personalizando el bot',
      },
      { status: 500 }
    );
  }
}

