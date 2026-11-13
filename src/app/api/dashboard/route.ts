import { NextResponse } from 'next/server';
import { readStore } from '@/lib/store';
import { getBotStatus, syncTelegramUpdates } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Sync pending Telegram messages (/start, /stop, etc.) if in polling mode
    const syncInfo = await syncTelegramUpdates().catch(() => ({
      processed: 0,
      activeSubscribers: 0,
      totalSubscribers: 0,
      mode: 'polling' as const,
    }));

    const botStatus = await getBotStatus();
    const store = readStore();

    const activeSubscribers = store.subscribers.filter((s) => s.active).length;

    return NextResponse.json({
      ok: true,
      botStatus,
      syncInfo,
      stats: {
        activeSubscribers,
        totalSubscribers: store.subscribers.length,
        totalPosts: store.posts.length,
        notifiedQuakesCount: store.notifiedQuakeIds.length,
      },
      subscribers: store.subscribers,
      posts: store.posts,
      quakeConfig: store.quakeConfig,
      botProfile: store.botProfile,
      botMessages: store.botMessages,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error cargando dashboard',
      },
      { status: 500 }
    );
  }
}

