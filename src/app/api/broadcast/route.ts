import { NextRequest, NextResponse } from 'next/server';
import { BroadcastPost, PostCategory, readStore, writeStore } from '@/lib/store';
import {
  BroadcastPhotoPayload,
  broadcastQuakeAlertSequence,
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

function truncateUtf16Safe(str: string, maxUnits: number): string {
  if (str.length <= maxUnits) return str;
  const target = Math.max(0, maxUnits - 1);
  let sliced = str.slice(0, target);
  const lastCode = sliced.charCodeAt(sliced.length - 1);
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) {
    sliced = sliced.slice(0, -1);
  }
  return `${sliced}…`;
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
      title = String(formData.get('title') || '')
        .replace(/\r\n/g, '\n')
        .trim();
      content = String(formData.get('content') || '')
        .replace(/\r\n/g, '\n')
        .trim();
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
      title = String(body.title || '')
        .replace(/\r\n/g, '\n')
        .trim();
      content = String(body.content || '')
        .replace(/\r\n/g, '\n')
        .trim();
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

    const linkLabel = 'Más información / Enlace oficial';
    let bodyForTelegram = content;
    let footerPlain = `🕒 Publicado: ${dateStr} • Extensión Barquisimeto`;
    let footerHtml = `🕒 <i>Publicado: ${dateStr} • Extensión Barquisimeto</i>`;
    let sep = '\n\n';

    // When sending a photo, Telegram requires the visible caption (without HTML tags) to be <= 1024 UTF-16 units
    // so that the image and text are delivered together in a single message.
    if (photoPayload) {
      const headerPlainLen = `${badge.icon} ${badge.label}`.length;
      const titlePlainLen = `📌 ${title}`.length;
      const linkPlainLen = linkUrl ? `🔗 ${linkLabel}`.length : 0;

      const calcVisibleLen = (bodyText: string, s: string, fPlain: string) =>
        headerPlainLen +
        s.length +
        titlePlainLen +
        s.length +
        bodyText.length +
        s.length +
        (linkPlainLen > 0 ? linkPlainLen + s.length : 0) +
        fPlain.length;

      // Step 1: If slightly over 1024, compact blank lines and footer first to preserve full content
      if (calcVisibleLen(bodyForTelegram, sep, footerPlain) > 1024) {
        sep = '\n';
        footerPlain = `🕒 ${dateStr} • IUJO Bqto`;
        footerHtml = `🕒 <i>${dateStr} • IUJO Bqto</i>`;
        bodyForTelegram = bodyForTelegram.replace(/\n{2,}/g, '\n');
      }

      // Step 2: If still over 1024, safely truncate bodyForTelegram so total visible length <= 1024
      const overhead =
        headerPlainLen +
        sep.length +
        titlePlainLen +
        sep.length +
        sep.length +
        (linkPlainLen > 0 ? linkPlainLen + sep.length : 0) +
        footerPlain.length;
      const maxBodyUnits = Math.max(50, 1024 - overhead);
      if (bodyForTelegram.length > maxBodyUnits) {
        bodyForTelegram = truncateUtf16Safe(bodyForTelegram, maxBodyUnits);
      }
    }

    let htmlMessage =
      `${badge.icon} <b>${badge.label}</b>${sep}` +
      `📌 <b>${escapeHtml(title)}</b>${sep}` +
      `${escapeHtml(bodyForTelegram)}${sep}`;

    if (linkUrl) {
      htmlMessage += `🔗 <a href="${escapeHtml(linkUrl)}">${linkLabel}</a>${sep}`;
    }

    htmlMessage += footerHtml;

    const delivery =
      category === 'sismo'
        ? await broadcastQuakeAlertSequence(htmlMessage, 'quakes', photoPayload)
        : await broadcastToSubscribers(htmlMessage, 'news', photoPayload);

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
