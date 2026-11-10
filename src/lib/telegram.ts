import fs from 'fs';
import path from 'path';
import {
  BotProfileConfig,
  readStore,
  upsertSubscriber,
  writeStore,
} from './store';
import { fetchRecentQuakesForBarquisimeto } from './seismic';

export function getBotToken(): string {
  const fromEnv =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELGRAM_API0 ||
    process.env.TELEGRAM_API0 ||
    process.env['TELGRAM-API0'] ||
    process.env.TELEGRAM_API;

  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim();
  }

  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (
            (key === 'TELGRAM-API0' ||
              key === 'TELEGRAM_BOT_TOKEN' ||
              key.includes('TELGRAM') ||
              key.includes('TELEGRAM')) &&
            val
          ) {
            return val;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  throw new Error(
    'No se encontró el token del bot en .env (TELGRAM-API0 o TELEGRAM_BOT_TOKEN).'
  );
}

function getApiBase(): string {
  return `https://api.telegram.org/bot${getBotToken()}`;
}

export async function telegramCall<T = unknown>(
  method: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; result?: T; description?: string; error_code?: number }> {
  const res = await fetch(`${getApiBase()}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  return res.json();
}

export async function getBotStatus() {
  try {
    const [meRes, webhookRes] = await Promise.all([
      telegramCall<{
        id: number;
        is_bot: boolean;
        first_name: string;
        username: string;
      }>('getMe'),
      telegramCall<{
        url: string;
        pending_update_count: number;
      }>('getWebhookInfo'),
    ]);

    if (!meRes.ok || !meRes.result) {
      return {
        connected: false,
        error: meRes.description || 'Token inválido o sin conexión a Telegram',
      };
    }

    const store = readStore();
    if (
      store.botProfile.username !== meRes.result.username ||
      store.botProfile.botId !== meRes.result.id
    ) {
      store.botProfile.username = meRes.result.username;
      store.botProfile.botId = meRes.result.id;
      writeStore(store);
    }

    return {
      connected: true,
      bot: meRes.result,
      webhook: webhookRes.result || { url: '', pending_update_count: 0 },
    };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Error conectando con Telegram API',
    };
  }
}

export async function customizeBotProfile(
  profileInput?: Partial<BotProfileConfig>,
  customPhoto?: BroadcastPhotoPayload
): Promise<{
  ok: boolean;
  steps: { step: string; ok: boolean; detail?: string }[];
  profile: BotProfileConfig;
}> {
  const store = readStore();
  const nextProfile: BotProfileConfig = {
    ...store.botProfile,
    ...(profileInput || {}),
  };

  const steps: { step: string; ok: boolean; detail?: string }[] = [];

  // 1. setMyName
  const nameRes = await telegramCall('setMyName', {
    name: nextProfile.name.slice(0, 64),
  });
  steps.push({
    step: 'Nombre del Bot (setMyName)',
    ok: nameRes.ok,
    detail: nameRes.description,
  });

  // 2. setMyShortDescription
  const shortRes = await telegramCall('setMyShortDescription', {
    short_description: nextProfile.shortDescription.slice(0, 120),
  });
  steps.push({
    step: 'Biografía corta (setMyShortDescription)',
    ok: shortRes.ok,
    detail: shortRes.description,
  });

  // 3. setMyDescription
  const descRes = await telegramCall('setMyDescription', {
    description: nextProfile.description.slice(0, 512),
  });
  steps.push({
    step: 'Descripción de bienvenida (setMyDescription)',
    ok: descRes.ok,
    detail: descRes.description,
  });

  // 4. setMyCommands
  const cmdRes = await telegramCall('setMyCommands', {
    commands: [
      { command: 'start', description: 'Suscribirme a noticias y alertas de IUJO Barquisimeto' },
      { command: 'sismos', description: 'Ver últimos sismos cercanos a Barquisimeto' },
      { command: 'estado', description: 'Consultar estado de mi suscripción' },
      { command: 'stop', description: 'Pausar notificaciones del bot' },
      { command: 'ayuda', description: 'Información de contacto y comandos' },
    ],
  });
  steps.push({
    step: 'Menú de Comandos (setMyCommands)',
    ok: cmdRes.ok,
    detail: cmdRes.description,
  });

  // 5. setMyProfilePhoto with custom uploaded image or default IUJO Barquisimeto JPG image
  try {
    let photoBuffer: Buffer | null = null;
    let photoMime = 'image/jpeg';
    let photoFilename = 'iujo-logo.jpg';

    if (customPhoto && customPhoto.buffer.length > 0) {
      photoBuffer = customPhoto.buffer;
      photoMime = customPhoto.mimeType || 'image/jpeg';
      photoFilename = customPhoto.filename || 'bot-profile.jpg';
    } else {
      const jpgPath = path.join(process.cwd(), 'public', 'iujo-logo.jpg');
      if (fs.existsSync(jpgPath)) {
        photoBuffer = fs.readFileSync(jpgPath);
      }
    }

    if (photoBuffer) {
      const uint8 = new Uint8Array(photoBuffer);
      const blob = new Blob([uint8], { type: photoMime });
      const form = new FormData();
      form.append(
        'photo',
        JSON.stringify({
          type: 'static',
          photo: 'attach://avatar_file',
        })
      );
      form.append('avatar_file', blob, photoFilename);

      const photoRes = await fetch(`${getApiBase()}/setMyProfilePhoto`, {
        method: 'POST',
        body: form,
      });
      const photoJson = await photoRes.json();

      if (photoJson.ok) {
        nextProfile.photoSynced = true;
      }
      steps.push({
        step: `Foto de Perfil del Bot (${photoFilename} → setMyProfilePhoto)`,
        ok: Boolean(photoJson.ok),
        detail: photoJson.description,
      });
    } else {
      steps.push({
        step: 'Foto de Perfil IUJO Barquisimeto',
        ok: false,
        detail: 'No se encontró public/iujo-logo.jpg ni imagen personalizada',
      });
    }
  } catch (err) {
    steps.push({
      step: 'Foto de Perfil del Bot (setMyProfilePhoto)',
      ok: false,
      detail: err instanceof Error ? err.message : 'Error subiendo imagen',
    });
  }

  nextProfile.lastSyncedAt = new Date().toISOString();
  store.botProfile = nextProfile;
  writeStore(store);

  return {
    ok: steps.some((s) => s.ok),
    steps,
    profile: nextProfile,
  };
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string
): Promise<{ ok: boolean; error_code?: number; description?: string }> {
  return telegramCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
  });
}

export interface BroadcastPhotoPayload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export async function sendTelegramPhoto(
  chatId: number | string,
  photo: BroadcastPhotoPayload | string,
  captionHtml?: string
): Promise<{
  ok: boolean;
  error_code?: number;
  description?: string;
  fileId?: string;
}> {
  if (typeof photo === 'string') {
    const res = await telegramCall<{
      photo?: { file_id: string }[];
    }>('sendPhoto', {
      chat_id: chatId,
      photo,
      caption: captionHtml,
      parse_mode: captionHtml ? 'HTML' : undefined,
    });
    const largest = res.result?.photo?.[res.result.photo.length - 1];
    return {
      ok: res.ok,
      error_code: res.error_code,
      description: res.description,
      fileId: largest?.file_id || photo,
    };
  }

  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (captionHtml) {
    form.append('caption', captionHtml);
    form.append('parse_mode', 'HTML');
  }
  const uint8 = new Uint8Array(photo.buffer);
  const blob = new Blob([uint8], { type: photo.mimeType || 'image/jpeg' });
  form.append('photo', blob, photo.filename || 'imagen-iujo.jpg');

  const response = await fetch(`${getApiBase()}/sendPhoto`, {
    method: 'POST',
    body: form,
    cache: 'no-store',
  });
  const json = await response.json();
  const photosArr = json.result?.photo;
  const largest = Array.isArray(photosArr) ? photosArr[photosArr.length - 1] : undefined;

  return {
    ok: Boolean(json.ok),
    error_code: json.error_code,
    description: json.description,
    fileId: largest?.file_id,
  };
}

export async function broadcastToSubscribers(
  htmlMessage: string,
  type: 'news' | 'quakes' = 'news',
  photoPayload?: BroadcastPhotoPayload
): Promise<{ sentCount: number; failedCount: number; totalTargets: number }> {
  const store = readStore();
  const targets = store.subscribers.filter((s) => {
    if (!s.active) return false;
    return type === 'quakes' ? s.receiveQuakes !== false : s.receiveNews !== false;
  });

  let sentCount = 0;
  let failedCount = 0;
  let storeModified = false;
  let cachedFileId: string | undefined;

  for (const sub of targets) {
    try {
      let res: { ok: boolean; error_code?: number; description?: string };

      if (photoPayload) {
        const photoSource = cachedFileId || photoPayload;
        // Always send photo and text together in a single Telegram message via sendPhoto caption
        const photoRes = await sendTelegramPhoto(sub.chatId, photoSource, htmlMessage);
        if (photoRes.fileId) cachedFileId = photoRes.fileId;
        res = photoRes;
      } else {
        res = await sendTelegramMessage(sub.chatId, htmlMessage);
      }

      if (res.ok) {
        sentCount++;
      } else {
        failedCount++;
        if (res.error_code === 403) {
          const idx = store.subscribers.findIndex((item) => item.chatId === sub.chatId);
          if (idx >= 0) {
            store.subscribers[idx].active = false;
            storeModified = true;
          }
        }
      }
    } catch {
      failedCount++;
    }
  }

  if (storeModified) {
    writeStore(store);
  }

  return {
    sentCount,
    failedCount,
    totalTargets: targets.length,
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    chat: {
      id: number;
      type: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      title?: string;
    };
    text?: string;
  };
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.chat) return;

  const chat = msg.chat;
  const rawText = (msg.text || '').trim();
  const cmd = rawText.split(/\s+/)[0].toLowerCase().split('@')[0];

  const store = readStore();
  const minMag = store.quakeConfig.minMagnitude.toFixed(1);

  if (cmd === '/stop' || cmd === '/baja') {
    upsertSubscriber(
      {
        id: chat.id,
        username: chat.username || msg.from?.username,
        first_name: chat.first_name || msg.from?.first_name || chat.title,
        last_name: chat.last_name || msg.from?.last_name,
      },
      false
    );

    await sendTelegramMessage(
      chat.id,
      `🔕 <b>Suscripción pausada</b>\n\nHas desactivado las notificaciones del bot de <b>IUJO Extensión Barquisimeto</b>.\nCuando desees volver a recibir alertas sísmicas y noticias, envía /start.`
    );
    return;
  }

  // Any other command or greeting subscribes / keeps active
  const { subscriber, isNew } = upsertSubscriber(
    {
      id: chat.id,
      username: chat.username || msg.from?.username,
      first_name: chat.first_name || msg.from?.first_name || chat.title,
      last_name: chat.last_name || msg.from?.last_name,
    },
    true
  );

  const displayName = subscriber.firstName || subscriber.username || 'Estudiante / Comunidad IUJO';

  if (cmd === '/start') {
    await sendTelegramMessage(
      chat.id,
      `❤️ <b>¡Hola, ${displayName}! Bienvenido a IUJO Extensión Barquisimeto (Fe y Alegría)</b>\n\n` +
        `${
          isNew
            ? '✅ <b>Te has suscrito exitosamente</b> a nuestro sistema de alertas y boletines.'
            : '✅ <b>Tu suscripción está activa</b> y actualizada.'
        }\n\n` +
        `🔔 <b>¿Qué recibirás por este canal?</b>\n` +
        `• 📢 Noticias académicas y comunicados oficiales\n` +
        `• 🚨 Avisos preventivos del campus en Barquisimeto\n` +
        `• 🌍 Alertas sísmicas automáticas (Sede Barquisimeto, umbral actual: <b>M ≥ ${minMag}</b> en un radio de ${store.quakeConfig.maxRadiusKm} km)\n\n` +
        `📌 <b>Comandos disponibles:</b>\n` +
        `/sismos — Ver últimos sismos detectados cerca de Barquisimeto\n` +
        `/estado — Consultar el estado de tu suscripción\n` +
        `/stop — Pausar las notificaciones`
    );
    return;
  }

  if (cmd === '/estado') {
    const updatedStore = readStore();
    const activeCount = updatedStore.subscribers.filter((s) => s.active).length;
    await sendTelegramMessage(
      chat.id,
      `📊 <b>Estado de tu Suscripción — IUJO Barquisimeto</b>\n\n` +
        `• <b>Usuario:</b> ${displayName}\n` +
        `• <b>Estado:</b> 🟢 Activo\n` +
        `• <b>Sede monitoreo sísmico:</b> ${updatedStore.quakeConfig.centerName}\n` +
        `• <b>Magnitud de alerta configurada:</b> M ≥ ${minMag} Mw\n` +
        `• <b>Comunidad suscrita:</b> ${activeCount} usuario(s) activos`
    );
    return;
  }

  if (cmd === '/sismos') {
    const quakes = await fetchRecentQuakesForBarquisimeto(store.quakeConfig, 30);
    if (quakes.length === 0) {
      await sendTelegramMessage(
        chat.id,
        `🌍 <b>Monitoreo Sísmico — Sede Barquisimeto</b>\n\n` +
          `No se han registrado sismos significativos (M ≥ 2.5) en un radio de ${store.quakeConfig.maxRadiusKm} km de Barquisimeto en los últimos 30 días.\n\n` +
          `⚙️ <i>Alerta automática activada para eventos de magnitud M ≥ ${minMag}.</i>`
      );
      return;
    }

    const top3 = quakes.slice(0, 3);
    const lines = top3.map((q, i) => {
      const d = new Intl.DateTimeFormat('es-VE', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Caracas',
      }).format(new Date(q.timestamp));
      return (
        `${i + 1}. <b>M ${q.magnitude.toFixed(1)}</b> — ${q.referenceBqto}\n` +
        `   🕒 ${d} | Prof: ${q.depthKm} km (${q.source})`
      );
    });

    await sendTelegramMessage(
      chat.id,
      `🌍 <b>Últimos Sismos Cercanos a Barquisimeto</b>\n` +
        `<i>Radio de monitoreo: ${store.quakeConfig.maxRadiusKm} km desde IUJO Barquisimeto</i>\n\n` +
        lines.join('\n\n') +
        `\n\n⚙️ <i>Recibirás una alerta inmediata si ocurre un sismo M ≥ ${minMag}.</i>`
    );
    return;
  }

  // Default reply (/ayuda or any message)
  await sendTelegramMessage(
    chat.id,
    `👋 Hola <b>${displayName}</b>, estás suscrito al canal informativo de <b>IUJO Extensión Barquisimeto</b>.\n\n` +
      `Usa estos comandos:\n` +
      `• /sismos — Consultar actividad sísmica reciente en Lara y alrededores\n` +
      `• /estado — Ver estado de tu suscripción\n` +
      `• /stop — Desactivar notificaciones`
  );
}

export async function syncTelegramUpdates(): Promise<{
  processed: number;
  activeSubscribers: number;
  totalSubscribers: number;
  mode: 'webhook' | 'polling';
}> {
  const store = readStore();

  // Check if webhook is set; if not, poll getUpdates
  const webhookInfo = await telegramCall<{ url: string }>('getWebhookInfo');
  if (webhookInfo.ok && webhookInfo.result?.url) {
    const current = readStore();
    return {
      processed: 0,
      activeSubscribers: current.subscribers.filter((s) => s.active).length,
      totalSubscribers: current.subscribers.length,
      mode: 'webhook',
    };
  }

  const updatesRes = await telegramCall<TelegramUpdate[]>('getUpdates', {
    offset: store.lastUpdateId ? store.lastUpdateId + 1 : undefined,
    timeout: 0,
    allowed_updates: ['message'],
  });

  let processed = 0;
  if (updatesRes.ok && Array.isArray(updatesRes.result)) {
    let maxUpdateId = store.lastUpdateId || 0;
    for (const upd of updatesRes.result) {
      if (upd.update_id > maxUpdateId) {
        maxUpdateId = upd.update_id;
      }
      await handleTelegramUpdate(upd);
      processed++;
    }
    if (maxUpdateId !== store.lastUpdateId) {
      const latestStore = readStore();
      latestStore.lastUpdateId = maxUpdateId;
      writeStore(latestStore);
    }
  }

  const finalStore = readStore();
  return {
    processed,
    activeSubscribers: finalStore.subscribers.filter((s) => s.active).length,
    totalSubscribers: finalStore.subscribers.length,
    mode: 'polling',
  };
}

