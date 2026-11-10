import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
const tokenMatch = envContent.match(/=(.+)/);
const token = tokenMatch ? tokenMatch[1].trim() : '';

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

const cmdRes = await tgPost('setMyCommands', {
  commands: [
    { command: 'start', description: 'Suscribirme a noticias y alertas de IUJO Barquisimeto' },
    { command: 'sismos', description: 'Ver últimos sismos cercanos a Barquisimeto' },
    { command: 'estado', description: 'Consultar estado de mi suscripción' },
    { command: 'stop', description: 'Pausar notificaciones del bot' },
    { command: 'ayuda', description: 'Información de contacto y comandos' },
  ],
});
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

