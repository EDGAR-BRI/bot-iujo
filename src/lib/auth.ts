export const SESSION_COOKIE_NAME = 'iujo_session';

export function getAdminCredentials(): {
  validUsers: string[];
  password: string;
  secret: string;
} {
  const envUser = (process.env.ADMIN_USER || '').trim();
  const password = (process.env.ADMIN_PASSWORD || 'iujo2026').trim();
  const secret = (
    process.env.AUTH_SECRET ||
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELGRAM_API0 ||
    process.env['TELGRAM-API0'] ||
    'iujo-barquisimeto-default-secret-2026'
  ).trim();

  const validUsers = envUser
    ? [envUser.toLowerCase()]
    : ['admin', 'admin@iujo.edu.ve'];

  return { validUsers, password, secret };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createSessionToken(username: string): Promise<string> {
  const { secret } = getAdminCredentials();
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `${encodeURIComponent(username)}.${exp}`;
  const signature = await hmacSha256Hex(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  token?: string | null
): Promise<{ valid: boolean; username?: string }> {
  if (!token) return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false };

  const [encodedUser, expStr, sig] = parts;
  const exp = Number(expStr);
  if (Number.isNaN(exp) || Date.now() > exp) {
    return { valid: false };
  }

  const { secret } = getAdminCredentials();
  const payload = `${encodedUser}.${expStr}`;
  const expectedSig = await hmacSha256Hex(secret, payload);

  if (sig !== expectedSig) {
    return { valid: false };
  }

  return {
    valid: true,
    username: decodeURIComponent(encodedUser),
  };
}

