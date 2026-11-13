export interface BotMessagesConfig {
  before: string;
  during: string;
  after: string;
  highFloors: string;
  emergencyDirectory: string;
}

export type BotMessageKey = keyof BotMessagesConfig;

export const DEFAULT_BOT_MESSAGES: BotMessagesConfig = {
  before:
    `🟡 <b>¿Qué hacer ANTES de un sismo?</b>\n` +
    `Prepararte hoy puede salvar vidas mañana. Sigue estos pasos básicos:\n\n` +
    `• <b>Identifica zonas seguras:</b> Ubica los lugares más resistentes de tu casa, escuela o trabajo (junto a columnas, muros de carga o debajo de mesas muy firmes) y aléjate de ventanas o espejos.\n` +
    `• <b>Despeja las salidas:</b> Mantén pasillos y puertas libres de muebles o cajas que puedan bloquear el paso.\n` +
    `• <b>Asegura objetos pesados:</b> Fija a la pared estantes, televisores y cuadros grandes para que no caigan.\n` +
    `• <b>Prepara tu mochila de emergencia:</b> Ten a la mano una linterna, radio con pilas, botiquín, agua embotellada, comida enlatada, un silbato y copias de tus documentos importantes.\n` +
    `• <b>Haz un plan familiar:</b> Acuerda con tu familia un punto de encuentro seguro afuera de casa por si se corta la comunicación.`,

  during:
    `🔴 <b>¿Qué hacer DURANTE un sismo?</b>\n` +
    `Mantén la calma y actúa rápido siguiendo estas reglas:\n\n` +
    `• <b>Agáchate, cúbrete y agárrate:</b> Si estás adentro, ponte en el suelo, métete debajo de una mesa resistente y sujétate de ella hasta que pase el movimiento.\n` +
    `• <b>Aléjate del peligro:</b> Mantente lejos de ventanas, vidrios, vitrinas y objetos que puedan caer.\n` +
    `• <b>No corras ni uses elevadores:</b> Usa siempre las escaleras y solo sal del edificio si la salida está cerca y es segura.\n` +
    `• <b>Si estás en la calle:</b> Aléjate de edificios, postes de luz, árboles y cables eléctricos. Ve hacia un espacio abierto.\n` +
    `• <b>Si vas manejando:</b> Detén el auto en un lugar despejado (lejos de puentes o postes), enciende las luces intermitentes y quédate adentro hasta que deje de temblar.`,

  after:
    `🟢 <b>¿Qué hacer DESPUÉS de un sismo?</b>\n` +
    `El peligro no termina cuando deja de temblar. Toma estas precauciones:\n\n` +
    `• <b>Revisa si hay heridos:</b> Ayuda a quienes lo necesiten, pero no muevas a personas con lesiones graves a menos que estén en peligro inmediato.\n` +
    `• <b>Inspecciona tu entorno:</b> Si notas grietas profundas en las paredes, olor a gas o cables sueltos, sal del lugar de inmediato.\n` +
    `• <b>Corta los servicios:</b> Si es seguro hacerlo, cierra las llaves de paso del gas y del agua, y baja el interruptor principal de la luz.\n` +
    `• <b>No enciendas fuego:</b> Evita usar fósforos, encendedores o velas hasta asegurarte de que no hay fugas de gas (usa linternas).\n` +
    `• <b>Usa el teléfono solo para emergencias:</b> Envía mensajes de texto en lugar de llamar para no saturar las líneas.\n` +
    `• <b>Prepárate para las réplicas:</b> Mantente alerta y en una zona segura, ya que pueden ocurrir movimientos secundarios.`,

  highFloors:
    `🏢 <b>Protocolo en Pisos Altos (IUJO / Edificios)</b>\n\n` +
    `<b>Protocolo de emergencia en PISOS ALTOS (IUJO y viviendas)</b>\n` +
    `Si te encuentras en un piso superior al momento de un sismo o terremoto, el movimiento se sentirá más fuerte. Sigue este protocolo estricto:\n\n` +
    `🔴 <b>DURANTE el sismo (Qué hacer en el momento):</b>\n` +
    `• <b>NO evacúes mientras tiembla:</b> Está prohibido bajar por las escaleras durante el movimiento; puedes perder el equilibrio y las cajas de escaleras son zonas vulnerables.\n` +
    `• <b>CERO ascensores:</b> Jamás intentes usar el ascensor; si se corta la electricidad quedarás atrapado.\n` +
    `• <b>Aléjate de ventanales y fachadas:</b> Los edificios altos oscilan y los vidrios pueden estallar. Mantente lejos de ventanas, estantes o carteleras que puedan caer.\n` +
    `• <b>Mantén la calma:</b> Es normal escuchar crujidos o sentir que la estructura se balancea; los edificios están diseñados para flexionar y absorber el movimiento.`,

  emergencyDirectory:
    `🚨 <b>DIRECTORIO DE EMERGENCIAS — BARQUISIMETO Y ESTADO LARA</b>\n` +
    `<i>IUJO Extensión Barquisimeto (Fe y Alegría)</i>\n\n` +
    `🆘 <b>Números Nacionales y de Emergencia</b>\n` +
    `• <b>VEN 9-1-1 (Emergencias generales):</b> 911\n` +
    `• <b>Línea de Rescate y Emergencia:</b> 0800-RESCATE (0800-7372283)\n` +
    `• <b>Protección Civil Lara:</b> 0251-2544889 / 0251-2543965 (IG: <a href="https://www.instagram.com/pcivil_venezuela">@pcivil_venezuela</a>)\n\n` +
    `🚒 <b>Cuerpo de Bomberos (Barquisimeto)</b>\n` +
    `• <b>Estación Central "Coronel (B) Vicencio Sequera":</b> 0251-2317475\n` +
    `• <b>Subestación Oeste:</b> 0416-0599572\n` +
    `• <b>Estación del Sur "Teniente Juan Alvarado":</b> 0251-2320777\n\n` +
    `🚑 <b>Ambulancias y Atención Médica</b>\n` +
    `• <b>Atención de Emergencias Barquisimeto / Cabudare</b> <i>(Traslados en Ambulancia y Asistencia Médica a Domicilio)</i>: ☎️ 0414-5338905\n\n` +
    `🚓 <b>Policías y Cuerpos de Seguridad Local</b>\n` +
    `• <b>Policía Municipal de Iribarren (PMI) — Comando General:</b> 0251-2550775\n` +
    `   ◦ Zona Este (Área 1): 0424-5470511\n` +
    `   ◦ Zona Centro (Área 2): 0426-5143478\n` +
    `   ◦ Zona Oeste (Área 3): 0426-2663959\n` +
    `   ◦ Zona Norte (Área 4): 0416-5611697\n` +
    `• <b>Policía del Estado Lara:</b> 0251-2310111 <i>(Carrera 28 con Calle 30)</i>\n` +
    `• <b>CICPC (Investigaciones Científicas, Penales y Criminalísticas):</b> 0251-2370511`,
};

export interface BotMessageFieldMeta {
  key: BotMessageKey;
  title: string;
  usedIn: string[];
  hint: string;
  rows: number;
}

export const BOT_MESSAGE_FIELDS: BotMessageFieldMeta[] = [
  {
    key: 'before',
    title: '🟡 ¿Qué hacer ANTES de un sismo?',
    usedIn: ['/start (bienvenida)', '/guia'],
    hint: 'Recomendaciones preventivas enviadas cuando un usuario se suscribe o solicita /guia.',
    rows: 9,
  },
  {
    key: 'during',
    title: '🔴 ¿Qué hacer DURANTE un sismo?',
    usedIn: ['/start', '/guia', 'Alerta Sísmica'],
    hint: 'Primer mensaje guía enviado en una alerta sísmica y también incluido en la bienvenida y /guia.',
    rows: 9,
  },
  {
    key: 'highFloors',
    title: '🏢 Protocolo en Pisos Altos (IUJO / Edificios)',
    usedIn: ['/start', '/guia', '/pisosaltos', 'Alerta Sísmica'],
    hint: 'Instrucciones para pisos superiores enviadas junto a las guías y en alertas sísmicas.',
    rows: 9,
  },
  {
    key: 'after',
    title: '🟢 ¿Qué hacer DESPUÉS de un sismo?',
    usedIn: ['/start', '/guia', 'Alerta Sísmica'],
    hint: 'Precauciones posteriores al movimiento enviadas en bienvenida, /guia y alertas sísmicas.',
    rows: 10,
  },
  {
    key: 'emergencyDirectory',
    title: '🚨 Directorio de Emergencias (Barquisimeto y Lara)',
    usedIn: ['/emergencias', 'Alerta Sísmica'],
    hint: 'Teléfonos de Bomberos, Protección Civil, Ambulancias y Policías enviados tras una alerta o con /emergencias.',
    rows: 14,
  },
];

/**
 * Escapes stray '&' characters while preserving valid Telegram HTML entities.
 */
export function prepareTelegramHtml(raw: string): string {
  return raw.replace(
    /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g,
    '&amp;'
  );
}

