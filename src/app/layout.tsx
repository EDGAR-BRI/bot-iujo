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
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-iujo-red selection:text-white">
        {children}
      </body>
    </html>
  );
}
