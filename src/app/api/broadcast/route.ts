import { NextRequest, NextResponse } from 'next/server';
import { BroadcastPost, PostCategory, readStore, writeStore } from '@/lib/store';
import {
  BroadcastPhotoPayload,
  broadcastToSubscribers,
  syncTelegramUpdates,
} from '@/lib/telegram';

const CATEGORY_BADGES: Record<PostCategory, { icon: string; label: string }> = {
  noticia: { icon: '📢', label: 'NOTICIA INSTITUCIONAL — IUJO BARQUISIMETO' },
  alerta: { icon: '🚨', label: 'ALERTA IMPORTANTE — IUJO BARQUISIMETO' },
  academico: { icon: '🎓', label: 'AVISO ACADÉMICO — IUJO BARQUISIMETO' },
  sismo: { icon: '🌍', label: 'REPORTE SÍSMICO — IUJO BARQUISIMETO' },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest) {
  try {
    // First sync any recent /start subscribers before broadcasting
    await syncTelegramUpdates().catch(() => null);

    let title = '';
    let content = '';
    let category: PostCategory = 'noticia';
    let linkUrl = '';
    let photoPayload: BroadcastPhotoPayload | undefined;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      title = String(formData.get('title') || '').trim();
      content = String(formData.get('content') || '').trim();
      category = (formData.get('category') || 'noticia') as PostCategory;
      linkUrl = String(formData.get('linkUrl') || '').trim();

      const imageEntry = formData.get('image');
      if (imageEntry && typeof imageEntry === 'object' && 'arrayBuffer' in imageEntry) {
        const file = imageEntry as File;
        if (file.size > 0) {
          if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
              { ok: false, error: 'La imagen no debe superar los 10 MB.' },
              { status: 400 }
            );
          }
          const arrBuf = await file.arrayBuffer();
          photoPayload = {
            buffer: Buffer.from(arrBuf),
            filename: file.name || 'comunicado-iujo.jpg',
            mimeType: file.type || 'image/jpeg',
          };
        }
      }
    } else {
      const body = await req.json();
      title = String(body.title || '').trim();
      content = String(body.content || '').trim();
      category = (body.category || 'noticia') as PostCategory;
      linkUrl = String(body.linkUrl || '').trim();
    }

    if (!title || !content) {
      return NextResponse.json(
        { ok: false, error: 'El título y el contenido son obligatorios.' },
        { status: 400 }
      );
    }

    const badge = CATEGORY_BADGES[category] || CATEGORY_BADGES.noticia;
    const dateStr = new Intl.DateTimeFormat('es-VE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Caracas',
    }).format(new Date());

    let htmlMessage =
      `${badge.icon} <b>${badge.label}</b>\n\n` +
      `📌 <b>${escapeHtml(title)}</b>\n\n` +
      `${escapeHtml(content)}\n\n`;

    if (linkUrl) {
      htmlMessage += `🔗 <a href="${escapeHtml(linkUrl)}">Más información / Enlace oficial</a>\n\n`;
    }

    htmlMessage += `🕒 <i>Publicado: ${dateStr} • Extensión Barquisimeto</i>`;

    const delivery = await broadcastToSubscribers(htmlMessage, 'news', photoPayload);

    const store = readStore();
    const newPost: BroadcastPost = {
      id: `post-${Date.now()}`,
      title,
      category,
      content,
      linkUrl: linkUrl || undefined,
      hasImage: Boolean(photoPayload),
      imageName: photoPayload?.filename,
      createdAt: new Date().toISOString(),
      sentCount: delivery.sentCount,
      failedCount: delivery.failedCount,
    };

    store.posts.unshift(newPost);
    writeStore(store);

    return NextResponse.json({
      ok: true,
      post: newPost,
      delivery,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error enviando publicación',
      },
      { status: 500 }
    );
  }
}
