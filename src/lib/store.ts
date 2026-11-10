import fs from 'fs';
import path from 'path';

export interface Subscriber {
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  subscribedAt: string;
  active: boolean;
  receiveNews: boolean;
  receiveQuakes: boolean;
}

export type PostCategory = 'noticia' | 'alerta' | 'academico' | 'sismo';

export interface BroadcastPost {
  id: string;
  title: string;
  category: PostCategory;
  content: string;
  linkUrl?: string;
  hasImage?: boolean;
  imageName?: string;
  createdAt: string;
  sentCount: number;
  failedCount: number;
}

export interface SeismicConfig {
  enabled: boolean;
  minMagnitude: number;
  maxRadiusKm: number;
  centerName: string;
  latitude: number;
  longitude: number;
  autoAlertTelegram: boolean;
  lastCheckedAt?: string;
}

export interface BotProfileConfig {
  name: string;
  shortDescription: string;
  description: string;
  username?: string;
  botId?: number;
  photoSynced?: boolean;
  lastSyncedAt?: string;
}

export interface StoreData {
  subscribers: Subscriber[];
  posts: BroadcastPost[];
  quakeConfig: SeismicConfig;
  notifiedQuakeIds: string[];
  lastUpdateId: number;
  botProfile: BotProfileConfig;
}

const DEFAULT_STORE: StoreData = {
  subscribers: [],
  posts: [],
  quakeConfig: {
    enabled: true,
    minMagnitude: 3.5,
    maxRadiusKm: 250,
    centerName: 'IUJO Extensión Barquisimeto, Edo. Lara',
    latitude: 10.0647,
    longitude: -69.357,
    autoAlertTelegram: true,
  },
  notifiedQuakeIds: [],
  lastUpdateId: 0,
  botProfile: {
    name: 'IUJO Barquisimeto | Alertas',
    shortDescription:
      'Canal oficial de noticias, avisos y alertas sísmicas de IUJO Extensión Barquisimeto (Fe y Alegría).',
    description:
      '👋 ¡Bienvenido al Bot de IUJO Extensión Barquisimeto (Fe y Alegría)!\n\nPor este medio recibirás:\n📢 Noticias y avisos académicos\n🚨 Alertas urgentes de la sede Barquisimeto\n🌍 Alertas sísmicas automáticas con sede en Barquisimeto y el Estado Lara\n\nEnvía /start para suscribirte.',
  },
};

function getStorePath(): string {
  const localDir = path.join(process.cwd(), 'data');
  const localFile = path.join(localDir, 'store.json');

  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    // Check write access in current directory (works locally; throws on Vercel read-only fs)
    fs.accessSync(localDir, fs.constants.W_OK);
    return localFile;
  } catch {
    const tmpFile = path.join('/tmp', 'bot-iujo-store.json');
    if (!fs.existsSync(tmpFile) && fs.existsSync(localFile)) {
      try {
        fs.copyFileSync(localFile, tmpFile);
      } catch {
        // ignore
      }
    }
    return tmpFile;
  }
}

export function readStore(): StoreData {
  const filePath = getStorePath();
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
      return structuredClone(DEFAULT_STORE);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return {
      ...structuredClone(DEFAULT_STORE),
      ...parsed,
      quakeConfig: {
        ...DEFAULT_STORE.quakeConfig,
        ...(parsed.quakeConfig || {}),
      },
      botProfile: {
        ...DEFAULT_STORE.botProfile,
        ...(parsed.botProfile || {}),
      },
      subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      notifiedQuakeIds: Array.isArray(parsed.notifiedQuakeIds) ? parsed.notifiedQuakeIds : [],
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export function writeStore(data: StoreData): StoreData {
  const filePath = getStorePath();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

export function upsertSubscriber(
  chat: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  },
  active = true
): { subscriber: Subscriber; isNew: boolean } {
  const store = readStore();
  const idx = store.subscribers.findIndex((s) => s.chatId === chat.id);
  const now = new Date().toISOString();

  if (idx >= 0) {
    const updated: Subscriber = {
      ...store.subscribers[idx],
      username: chat.username ?? store.subscribers[idx].username,
      firstName: chat.first_name ?? store.subscribers[idx].firstName,
      lastName: chat.last_name ?? store.subscribers[idx].lastName,
      active,
    };
    store.subscribers[idx] = updated;
    writeStore(store);
    return { subscriber: updated, isNew: false };
  }

  const created: Subscriber = {
    chatId: chat.id,
    username: chat.username,
    firstName: chat.first_name,
    lastName: chat.last_name,
    subscribedAt: now,
    active,
    receiveNews: true,
    receiveQuakes: true,
  };
  store.subscribers.unshift(created);
  writeStore(store);
  return { subscriber: created, isNew: true };
}

