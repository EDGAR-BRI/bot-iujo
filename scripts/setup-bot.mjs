import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
let token = '';
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (
      (key === 'TELEGRAM_BOT_TOKEN' ||
        key === 'TELGRAM_API0' ||
        key === 'TELEGRAM_API0' ||
        key === 'TELGRAM-API0' ||
        key === 'TELEGRAM_API') &&
      val
    ) {
      token = val;
      break;
    }
  }
}

if (!token) {
  console.error('No se encontró token en .env');
  process.exit(1);
}

const apiBase = `https://api.telegram.org/bot${token}`;

async function tgPost(method, body) {
  const res = await fetch(`${apiBase}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

const me = await fetch(`${apiBase}/getMe`).then((r) => r.json());
console.log('getMe:', JSON.stringify(me));

const nameRes = await tgPost('setMyName', {
  name: 'IUJO Barquisimeto | Alertas',
});
console.log('setMyName:', JSON.stringify(nameRes));

const shortRes = await tgPost('setMyShortDescription', {
  short_description:
    'Canal oficial de noticias, avisos y alertas sísmicas de IUJO Extensión Barquisimeto (Fe y Alegría).',
});
console.log('setMyShortDescription:', JSON.stringify(shortRes));

const descRes = await tgPost('setMyDescription', {
  description:
    '👋 ¡Bienvenido al Bot de IUJO Extensión Barquisimeto (Fe y Alegría)!\n\nPor este medio recibirás:\n📢 Noticias y avisos académicos\n🚨 Alertas urgentes de la sede Barquisimeto\n🌍 Alertas sísmicas automáticas con sede en Barquisimeto y el Estado Lara\n\nEnvía /start para suscribirte.',
});
console.log('setMyDescription:', JSON.stringify(descRes));

const commands = [
  { command: 'start', description: 'Suscribirme a noticias y alertas de IUJO Barquisimeto' },
  { command: 'guia', description: 'Qué hacer antes, durante, después y en pisos altos' },
  { command: 'pisosaltos', description: 'Protocolo sísmico en pisos altos (IUJO / edificios)' },
  { command: 'sismos', description: 'Ver últimos sismos cercanos a Barquisimeto' },
  { command: 'emergencias', description: 'Directorio de emergencias en Barquisimeto y Lara' },
  { command: 'estado', description: 'Consultar estado de mi suscripción' },
  { command: 'stop', description: 'Pausar notificaciones del bot' },
  { command: 'ayuda', description: 'Información de contacto y comandos' },
];

const cmdRes = await tgPost('setMyCommands', { commands });
await tgPost('setMyCommands', { commands, language_code: 'es' });
await tgPost('setMyCommands', { commands, scope: { type: 'all_private_chats' } });
await tgPost('setMyCommands', {
  commands,
  scope: { type: 'all_private_chats' },
  language_code: 'es',
});
await tgPost('setChatMenuButton', { menu_button: { type: 'commands' } });
console.log('setMyCommands:', JSON.stringify(cmdRes));

const jpgPath = path.join(process.cwd(), 'public', 'iujo-logo.jpg');
const buffer = fs.readFileSync(jpgPath);
const blob = new Blob([buffer], { type: 'image/jpeg' });
const form = new FormData();
form.append(
  'photo',
  JSON.stringify({
    type: 'static',
    photo: 'attach://avatar_file',
  })
);
form.append('avatar_file', blob, 'iujo-logo.jpg');

const photoRes = await fetch(`${apiBase}/setMyProfilePhoto`, {
  method: 'POST',
  body: form,
}).then((r) => r.json());
console.log('setMyProfilePhoto:', JSON.stringify(photoRes));

