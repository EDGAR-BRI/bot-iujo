import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IUJO Extensión Barquisimeto — Panel de Alertas, Noticias y Monitor Sísmico',
  description:
    'Panel de administración del Bot de Telegram de IUJO Extensión Barquisimeto (Fe y Alegría): gestión de suscriptores, noticias institucionales y alertas sísmicas en tiempo real.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

