import { NextRequest, NextResponse } from 'next/server';
import { BroadcastPost, PostCategory, readStore, writeStore } from '@/lib/store';
import { broadcastToSubscribers, syncTelegramUpdates } from '@/lib/telegram';

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

    const body = await req.json();
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const category = (body.category || 'noticia') as PostCategory;
    const linkUrl = String(body.linkUrl || '').trim();

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

    const delivery = await broadcastToSubscribers(htmlMessage, 'news');

    const store = readStore();
    const newPost: BroadcastPost = {
      id: `post-${Date.now()}`,
      title,
      category,
      content,
      linkUrl: linkUrl || undefined,
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

