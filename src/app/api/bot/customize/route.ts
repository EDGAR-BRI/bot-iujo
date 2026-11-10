import { NextRequest, NextResponse } from 'next/server';
import {
  BroadcastPhotoPayload,
  customizeBotProfile,
  telegramCall,
} from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const name = String(formData.get('name') || '').trim();
      const shortDescription = String(formData.get('shortDescription') || '').trim();
      const description = String(formData.get('description') || '').trim();

      let customPhoto: BroadcastPhotoPayload | undefined;
      const photoEntry = formData.get('photo');
      if (photoEntry && typeof photoEntry === 'object' && 'arrayBuffer' in photoEntry) {
        const file = photoEntry as File;
        if (file.size > 0) {
          if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
              { ok: false, error: 'La foto de perfil no debe superar los 10 MB.' },
              { status: 400 }
            );
          }
          const arrBuf = await file.arrayBuffer();
          customPhoto = {
            buffer: Buffer.from(arrBuf),
            filename: file.name || 'bot-avatar.jpg',
            mimeType: file.type || 'image/jpeg',
          };
        }
      }

      const result = await customizeBotProfile(
        {
          name,
          shortDescription,
          description,
        },
        customPhoto
      );
      return NextResponse.json(result);
    }

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

