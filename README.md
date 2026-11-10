# IUJO Extensión Barquisimeto — Bot de Noticias, Alertas y Monitor Sísmico

Aplicación Full-Stack en **Next.js (App Router)** lista para desplegar en **Vercel** que gestiona el Bot de Telegram institucional de **IUJO Extensión Barquisimeto (Fe y Alegría)**.

## Características Principales

1. **Personalización Automática del Bot de Telegram (`/api/bot/customize`)**:
   - Configura nombre, biografía corta, descripción de bienvenida, menú de comandos (`/start`, `/sismos`, `/estado`, `/stop`, `/ayuda`) y sube la **foto de perfil oficial de IUJO Extensión Barquisimeto** (`public/iujo-logo.jpg`) usando `setMyProfilePhoto`.
2. **Gestión y Conteo de Usuarios Suscritos (`/api/dashboard`)**:
   - Registro automático cuando cualquier usuario envía `/start` al bot.
   - Panel con contador en tiempo real y directorio de suscriptores activos.
3. **Publicación de Noticias, Alertas y Avisos Académicos (`/api/broadcast`)**:
   - Formulario con vista previa en vivo e historial de envíos.
4. **Monitoreo y Alerta Sísmica con Sede en Barquisimeto (`/api/quakes`)**:
   - Geocercado centrado en **IUJO Extensión Barquisimeto (`10.0647° N, -69.3570° O`)** sobre el corredor de la **Falla de Boconó**.
   - Consulta en tiempo real a **USGS (FDSN GeoJSON)** y **EMSC (SeismicPortal)** con cálculo de distancia Haversine hacia Barquisimeto y localidades del Estado Lara (Cabudare, Quíbor, El Tocuyo, Carora, Duaca, Sarare).
   - Umbral de magnitud **M ≥ N** configurable desde el Dashboard y botón de **Simulacro Sísmico** para pruebas en Telegram.

## Ejecución Local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

