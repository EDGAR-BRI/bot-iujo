import { NextRequest, NextResponse } from 'next/server';
import {
  buildBarquisimetoReference,
  fetchRecentQuakesForBarquisimeto,
  formatQuakeTelegramAlert,
  getSeverity,
  QuakeEvent,
} from '@/lib/seismic';
import { BroadcastPost, readStore, writeStore } from '@/lib/store';
import { broadcastQuakeAlertSequence, syncTelegramUpdates } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const store = readStore();
    const quakes = await fetchRecentQuakesForBarquisimeto(store.quakeConfig, 30);

    // Check if any earthquake in the last 12 hours exceeds minMagnitude and has not been notified
    const cutoffRecent = Date.now() - 12 * 60 * 60 * 1000;
    const newlyNotified: QuakeEvent[] = [];

    if (store.quakeConfig.enabled && store.quakeConfig.autoAlertTelegram) {
      for (const q of quakes) {
        if (
          q.magnitude >= store.quakeConfig.minMagnitude &&
          q.timestamp >= cutoffRecent &&
          !store.notifiedQuakeIds.includes(q.id)
        ) {
          const alertHtml = formatQuakeTelegramAlert(q, false);
          const delivery = await broadcastQuakeAlertSequence(alertHtml, 'quakes');
          store.notifiedQuakeIds.push(q.id);
          newlyNotified.push(q);

          store.posts.unshift({
            id: `quake-alert-${Date.now()}-${q.id}`,
            title: `Alerta Sísmica Automática M ${q.magnitude.toFixed(1)} — ${q.referenceBqto}`,
            category: 'sismo',
            content: `Epicentro: ${q.place} | Profundidad: ${q.depthKm} km | Fuente: ${q.source}`,
            linkUrl: q.url,
            createdAt: new Date().toISOString(),
            sentCount: delivery.sentCount,
            failedCount: delivery.failedCount,
          });
        }
      }
    }

    store.quakeConfig.lastCheckedAt = new Date().toISOString();
    writeStore(store);

    const matchingThreshold = quakes.filter(
      (q) => q.magnitude >= store.quakeConfig.minMagnitude
    );

    return NextResponse.json({
      ok: true,
      config: store.quakeConfig,
      quakes,
      matchingCount: matchingThreshold.length,
      newlyNotified,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error consultando actividad sísmica',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const store = readStore();

    const minMagnitude = Number(body.minMagnitude);
    const maxRadiusKm = Number(body.maxRadiusKm);

    store.quakeConfig = {
      ...store.quakeConfig,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : store.quakeConfig.enabled,
      autoAlertTelegram:
        typeof body.autoAlertTelegram === 'boolean'
          ? body.autoAlertTelegram
          : store.quakeConfig.autoAlertTelegram,
      minMagnitude:
        !Number.isNaN(minMagnitude) && minMagnitude >= 1.5 && minMagnitude <= 9.0
          ? Math.round(minMagnitude * 10) / 10
          : store.quakeConfig.minMagnitude,
      maxRadiusKm:
        !Number.isNaN(maxRadiusKm) && maxRadiusKm >= 30 && maxRadiusKm <= 1000
          ? Math.round(maxRadiusKm)
          : store.quakeConfig.maxRadiusKm,
    };

    writeStore(store);

    return NextResponse.json({
      ok: true,
      config: store.quakeConfig,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error guardando configuración sísmica',
      },
      { status: 500 }
    );
  }
}

// POST: Simulate a seismic alert in Barquisimeto to test Telegram notification with configured magnitude N
export async function POST(req: NextRequest) {
  try {
    await syncTelegramUpdates().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const store = readStore();

    const simMagnitude = Number(body.magnitude || store.quakeConfig.minMagnitude);
    // Simulate coordinates slightly SW of Barquisimeto (towards Quíbor / Falla de Boconó)
    const simLat = 9.985;
    const simLon = -69.462;
    const ref = buildBarquisimetoReference(
      simLat,
      simLon,
      store.quakeConfig.latitude,
      store.quakeConfig.longitude
    );

    const simulatedQuake: QuakeEvent = {
      id: `sim-bqto-${Date.now()}`,
      magnitude: simMagnitude,
      place: 'Falla de Boconó — Sector Oeste de Barquisimeto, Estado Lara, Venezuela',
      time: new Date().toISOString(),
      timestamp: Date.now(),
      depthKm: 12.4,
      latitude: simLat,
      longitude: simLon,
      distanceFromBqtoKm: ref.distanceKm,
      referenceBqto: ref.text,
      source: 'SIMULACRO-IUJO',
      url: `https://www.google.com/maps?q=${simLat},${simLon}`,
      severity: getSeverity(simMagnitude),
    };

    const htmlAlert = formatQuakeTelegramAlert(simulatedQuake, true);
    const delivery = await broadcastQuakeAlertSequence(htmlAlert, 'quakes');

    const postRecord: BroadcastPost = {
      id: `post-sim-${Date.now()}`,
      title: `[Simulacro] Alerta Sísmica M ${simMagnitude.toFixed(1)} — Sede Barquisimeto`,
      category: 'sismo',
      content: `${simulatedQuake.referenceBqto}. Profundidad: ${simulatedQuake.depthKm} km.`,
      linkUrl: simulatedQuake.url,
      createdAt: new Date().toISOString(),
      sentCount: delivery.sentCount,
      failedCount: delivery.failedCount,
    };

    store.posts.unshift(postRecord);
    writeStore(store);

    return NextResponse.json({
      ok: true,
      simulatedQuake,
      delivery,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Error ejecutando simulacro sísmico',
      },
      { status: 500 }
    );
  }
}

