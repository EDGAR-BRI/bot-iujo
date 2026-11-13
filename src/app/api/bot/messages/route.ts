import { NextRequest, NextResponse } from 'next/server';
import {
  BOT_MESSAGE_FIELDS,
  BotMessagesConfig,
  DEFAULT_BOT_MESSAGES,
} from '@/lib/bot-messages';
import { readStore, writeStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const store = readStore();
    return NextResponse.json({
      ok: true,
      messages: store.botMessages,
      defaults: DEFAULT_BOT_MESSAGES,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error leyendo mensajes del bot',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();

    if (body.action === 'reset') {
      store.botMessages = { ...DEFAULT_BOT_MESSAGES };
      writeStore(store);
      return NextResponse.json({
        ok: true,
        messages: store.botMessages,
        message: 'Todos los mensajes fueron restaurados a sus valores originales.',
      });
    }

    const nextMessages: BotMessagesConfig = { ...store.botMessages };

    for (const field of BOT_MESSAGE_FIELDS) {
      if (field.key in body) {
        const value = String(body[field.key] ?? '').replace(/\r\n/g, '\n').trim();
        if (!value) {
          return NextResponse.json(
            {
              ok: false,
              error: `El mensaje "${field.title}" no puede quedar vacío.`,
            },
            { status: 400 }
          );
        }
        if (value.length > 4096) {
          return NextResponse.json(
            {
              ok: false,
              error: `El mensaje "${field.title}" supera el límite de 4096 caracteres permitido por Telegram.`,
            },
            { status: 400 }
          );
        }
        nextMessages[field.key] = value;
      }
    }

    store.botMessages = nextMessages;
    writeStore(store);

    return NextResponse.json({
      ok: true,
      messages: store.botMessages,
      message: 'Mensajes y guías guardados correctamente. El bot ya usa el contenido actualizado.',
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error guardando mensajes del bot',
      },
      { status: 500 }
    );
  }
}

