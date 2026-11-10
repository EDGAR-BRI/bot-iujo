'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ExternalLink,
  Megaphone,
  Radio,
  RefreshCw,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  BotProfileConfig,
  BroadcastPost,
  PostCategory,
  SeismicConfig,
  Subscriber,
} from '@/lib/store';
import type { QuakeEvent } from '@/lib/seismic';

interface BotStatusData {
  connected: boolean;
  error?: string;
  bot?: {
    id: number;
    first_name: string;
    username: string;
  };
  webhook?: {
    url: string;
    pending_update_count: number;
  };
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<
    'broadcast' | 'seismic' | 'subscribers' | 'customize'
  >('broadcast');

  // Dashboard state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatusData>({ connected: false });
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [posts, setPosts] = useState<BroadcastPost[]>([]);
  const [quakeConfig, setQuakeConfig] = useState<SeismicConfig>({
    enabled: true,
    minMagnitude: 3.5,
    maxRadiusKm: 250,
    centerName: 'IUJO Extensión Barquisimeto, Edo. Lara',
    latitude: 10.0647,
    longitude: -69.357,
    autoAlertTelegram: true,
  });
  const [botProfile, setBotProfile] = useState<BotProfileConfig>({
    name: 'IUJO Barquisimeto | Alertas',
    shortDescription:
      'Canal oficial de noticias, avisos y alertas sísmicas de IUJO Extensión Barquisimeto (Fe y Alegría).',
    description:
      '👋 ¡Bienvenido al Bot de IUJO Extensión Barquisimeto (Fe y Alegría)!\n\nPor este medio recibirás:\n📢 Noticias y avisos académicos\n🚨 Alertas urgentes de la sede Barquisimeto\n🌍 Alertas sísmicas automáticas con sede en Barquisimeto y el Estado Lara\n\nEnvía /start para suscribirte.',
  });

  // Broadcast form state
  const [postCategory, setPostCategory] = useState<PostCategory>('noticia');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postLink, setPostLink] = useState('');
  const [isSendingPost, setIsSendingPost] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Seismic state
  const [quakes, setQuakes] = useState<QuakeEvent[]>([]);
  const [loadingQuakes, setLoadingQuakes] = useState(false);
  const [savingQuakeConfig, setSavingQuakeConfig] = useState(false);
  const [simulatingQuake, setSimulatingQuake] = useState(false);
  const [seismicFeedback, setSeismicFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Customize bot state
  const [isCustomizingBot, setIsCustomizingBot] = useState(false);
  const [customizeSteps, setCustomizeSteps] = useState<
    { step: string; ok: boolean; detail?: string }[]
  >([]);
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookFeedback, setWebhookFeedback] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  // Modern Web Guidance: Sync aria-invalid with :user-invalid + fallback for older browsers
  useEffect(() => {
    const dirtyState = new WeakMap<Element, { hasInteracted: boolean; hasBlurred: boolean }>();
    const supportsUserInvalid =
      typeof CSS !== 'undefined' && CSS.supports('selector(:user-invalid)');

    const syncAriaAndFallback = (target: EventTarget | null, eventType: string) => {
      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        )
      ) {
        return;
      }

      if (!supportsUserInvalid) {
        const state = dirtyState.get(target) || {
          hasInteracted: false,
          hasBlurred: false,
        };
        if (eventType === 'input' || eventType === 'change') state.hasInteracted = true;
        if (eventType === 'blur') state.hasBlurred = true;
        dirtyState.set(target, state);

        if (state.hasInteracted && state.hasBlurred) {
          const valid = target.checkValidity();
          target.classList.toggle('user-invalid-fallback', !valid);
          target.classList.toggle('user-valid-fallback', valid);
          target.setAttribute('aria-invalid', !valid ? 'true' : 'false');
        }
        return;
      }

      if (eventType === 'blur' || target.hasAttribute('aria-invalid')) {
        const isUserInvalid = target.matches(':user-invalid');
        target.setAttribute('aria-invalid', isUserInvalid ? 'true' : 'false');
      }
    };

    const onBlur = (e: Event) => syncAriaAndFallback(e.target, 'blur');
    const onInput = (e: Event) => syncAriaAndFallback(e.target, 'input');

    document.addEventListener('blur', onBlur, true);
    document.addEventListener('input', onInput);
    return () => {
      document.removeEventListener('blur', onBlur, true);
      document.removeEventListener('input', onInput);
    };
  }, []);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setBotStatus(data.botStatus);
        setSubscribers(data.subscribers || []);
        setPosts(data.posts || []);
        if (data.quakeConfig) setQuakeConfig(data.quakeConfig);
        if (data.botProfile) {
          setBotProfile((prev) => ({
            ...prev,
            ...data.botProfile,
          }));
        }
        if (data.botStatus?.webhook?.url) {
          setWebhookUrlInput(data.botStatus.webhook.url);
        }
      }
    } catch {
      // ignore network error during background poll
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  const loadQuakes = useCallback(async () => {
    setLoadingQuakes(true);
    try {
      const res = await fetch('/api/quakes', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setQuakes(data.quakes || []);
        if (Array.isArray(data.newlyNotified) && data.newlyNotified.length > 0) {
          setSeismicFeedback({
            type: 'info',
            text: `🚨 ¡Se detectó y notificó automáticamente ${data.newlyNotified.length} sismo(s) que superaron el umbral configurado!`,
          });
          loadDashboard(true);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingQuakes(false);
    }
  }, [loadDashboard]);

  useEffect(() => {
    loadDashboard();
    loadQuakes();

    // Poll every 12 seconds so new Telegram /start subscribers appear automatically
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 12000);

    // Check seismic feed every 90 seconds while dashboard is open
    const quakeInterval = setInterval(() => {
      loadQuakes();
    }, 90000);

    return () => {
      clearInterval(interval);
      clearInterval(quakeInterval);
    };
  }, [loadDashboard, loadQuakes]);

  async function handlePublishBroadcast(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      firstInvalid?.focus();
      return;
    }

    setIsSendingPost(true);
    setBroadcastFeedback(null);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: postCategory,
          title: postTitle,
          content: postContent,
          linkUrl: postLink,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setBroadcastFeedback({
          type: 'error',
          text: data.error || 'No se pudo enviar la publicación.',
        });
      } else {
        setBroadcastFeedback({
          type: 'success',
          text: `¡Publicación enviada con éxito a ${data.delivery.sentCount} de ${data.delivery.totalTargets} suscriptor(es) activos en Telegram!`,
        });
        setPostTitle('');
        setPostContent('');
        setPostLink('');
        form.reset();
        await loadDashboard(true);
      }
    } catch {
      setBroadcastFeedback({
        type: 'error',
        text: 'Error de red al enviar la publicación.',
      });
    } finally {
      setIsSendingPost(false);
    }
  }

  async function handleSaveSeismicConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingQuakeConfig(true);
    setSeismicFeedback(null);
    try {
      const res = await fetch('/api/quakes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quakeConfig),
      });
      const data = await res.json();
      if (data.ok) {
        setQuakeConfig(data.config);
        setSeismicFeedback({
          type: 'success',
          text: `Configuración guardada: Se alertará automáticamente cuando ocurra un sismo de magnitud M ≥ ${data.config.minMagnitude.toFixed(
            1
          )} en un radio de ${data.config.maxRadiusKm} km desde IUJO Barquisimeto.`,
        });
        await loadQuakes();
      } else {
        setSeismicFeedback({
          type: 'error',
          text: data.error || 'No se pudo guardar la configuración.',
        });
      }
    } catch {
      setSeismicFeedback({
        type: 'error',
        text: 'Error guardando la configuración sísmica.',
      });
    } finally {
      setSavingQuakeConfig(false);
    }
  }

  async function handleSimulateQuakeAlert() {
    setSimulatingQuake(true);
    setSeismicFeedback(null);
    try {
      const res = await fetch('/api/quakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnitude: quakeConfig.minMagnitude }),
      });
      const data = await res.json();
      if (data.ok) {
        setSeismicFeedback({
          type: 'success',
          text: `🧪 Simulacro Sísmico (M ${quakeConfig.minMagnitude.toFixed(
            1
          )} en Barquisimeto) enviado por Telegram a ${data.delivery.sentCount} suscriptor(es) activo(s).`,
        });
        await loadDashboard(true);
      } else {
        setSeismicFeedback({
          type: 'error',
          text: data.error || 'Error enviando simulacro sísmico.',
        });
      }
    } catch {
      setSeismicFeedback({
        type: 'error',
        text: 'Error de conexión ejecutando simulacro sísmico.',
      });
    } finally {
      setSimulatingQuake(false);
    }
  }

  async function handleCustomizeBot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsCustomizingBot(true);
    setCustomizeSteps([]);
    try {
      const res = await fetch('/api/bot/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: botProfile.name,
          shortDescription: botProfile.shortDescription,
          description: botProfile.description,
        }),
      });
      const data = await res.json();
      if (data.steps) {
        setCustomizeSteps(data.steps);
      }
      await loadDashboard(true);
    } catch {
      setCustomizeSteps([
        {
          step: 'Conexión con Telegram API',
          ok: false,
          detail: 'No se pudo conectar con el servidor',
        },
      ]);
    } finally {
      setIsCustomizingBot(false);
    }
  }

  async function handleSetWebhook(urlToSet: string) {
    setWebhookFeedback(null);
    try {
      const res = await fetch('/api/bot/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setWebhook',
          webhookUrl: urlToSet,
        }),
      });
      const data = await res.json();
      setWebhookFeedback(data.message || data.description || 'Actualizado');
      await loadDashboard(true);
    } catch {
      setWebhookFeedback('Error configurando el webhook.');
    }
  }

  const activeSubscribersCount = subscribers.filter((s) => s.active).length;
  const botUsername = botStatus.bot?.username || botProfile.username;

  return (
    <div className="app-container" ref={rootRef}>
      {/* Top Institutional Header */}
      <header className="top-header">
        <div className="brand-box">
          <img
            src="/iujo-logo.jpg"
            alt="Logo IUJO Extensión Barquisimeto - Fe y Alegría"
            className="brand-logo"
            width={64}
            height={64}
          />
          <div>
            <h1 className="brand-title">
              IUJO Extensión Barquisimeto — Centro de Notificaciones y Alerta Sísmica
            </h1>
            <p className="brand-subtitle">
              Instituto Universitario Jesús Obrero (Fe y Alegría) • Gestión de Bot de Telegram y Monitoreo Sísmico en Lara
            </p>
          </div>
        </div>

        <div className="header-actions">
          <div className="status-pill" aria-live="polite">
            <span
              className={`status-dot ${botStatus.connected ? '' : 'offline'}`}
              aria-hidden="true"
            />
            {botStatus.connected
              ? `Bot Activo: @${botUsername}`
              : loading
              ? 'Conectando con Telegram...'
              : 'Bot sin conexión'}
          </div>

          {botUsername && (
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={16} aria-hidden="true" />
              Abrir @{botUsername}
            </a>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              loadDashboard(false);
              loadQuakes();
            }}
            disabled={syncing}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
        </div>
      </header>

      {/* KPI Summary Cards */}
      <section className="kpi-grid" aria-label="Métricas principales del sistema">
        <div className="kpi-card highlight">
          <span className="kpi-label">
            <Users size={18} color="#d32f2f" aria-hidden="true" />
            Usuarios Suscritos Activos
          </span>
          <span className="kpi-value">{activeSubscribersCount}</span>
          <span className="kpi-footnote">
            {subscribers.length} registrados en total (vía comando /start)
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">
            <Activity size={18} color="#d97706" aria-hidden="true" />
            Alerta Sísmica Barquisimeto
          </span>
          <span className="kpi-value">M ≥ {quakeConfig.minMagnitude.toFixed(1)}</span>
          <span className="kpi-footnote">
            Radio: {quakeConfig.maxRadiusKm} km desde sede IUJO Barquisimeto
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">
            <Megaphone size={18} color="#0b57d0" aria-hidden="true" />
            Boletines y Alertas Enviadas
          </span>
          <span className="kpi-value">{posts.length}</span>
          <span className="kpi-footnote">
            Noticias institucionales, avisos y reportes sísmicos
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">
            <Bot size={18} color="#188038" aria-hidden="true" />
            Modo de Recepción Telegram
          </span>
          <span className="kpi-value" style={{ fontSize: '1.45rem' }}>
            {botStatus.webhook?.url ? 'Webhook (Vercel)' : 'Polling Activo'}
          </span>
          <span className="kpi-footnote">
            {botStatus.connected
              ? `ID: ${botStatus.bot?.id} • Listo para enviar`
              : botStatus.error || 'Verificando token en .env'}
          </span>
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className="tabs-bar" aria-label="Secciones del panel">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
          onClick={() => setActiveTab('broadcast')}
        >
          <Megaphone size={18} aria-hidden="true" />
          Publicar Noticia / Alerta
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'seismic' ? 'active' : ''}`}
          onClick={() => setActiveTab('seismic')}
        >
          <Activity size={18} aria-hidden="true" />
          Monitor Sísmico Barquisimeto (M ≥ {quakeConfig.minMagnitude.toFixed(1)})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'subscribers' ? 'active' : ''}`}
          onClick={() => setActiveTab('subscribers')}
        >
          <Users size={18} aria-hidden="true" />
          Usuarios Suscritos ({activeSubscribersCount})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'customize' ? 'active' : ''}`}
          onClick={() => setActiveTab('customize')}
        >
          <Settings size={18} aria-hidden="true" />
          Personalizar Bot y Despliegue Vercel
        </button>
      </nav>

      {/* TAB 1: PUBLISH NEWS OR ALERTS */}
      {activeTab === 'broadcast' && (
        <div className="dashboard-grid">
          <section className="card">
            <h2 className="card-title">
              <Send size={20} color="#d32f2f" aria-hidden="true" />
              Enviar Noticia o Alerta a la Comunidad IUJO
            </h2>
            <p className="card-desc">
              Redacta un comunicado o alerta. Se enviará inmediatamente por Telegram a los{' '}
              <strong>{activeSubscribersCount} usuario(s) suscritos</strong>.
            </p>

            {broadcastFeedback && (
              <div
                className={`feedback-banner ${broadcastFeedback.type}`}
                role="status"
                aria-live="polite"
              >
                {broadcastFeedback.type === 'success' ? (
                  <CheckCircle2 size={20} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={20} aria-hidden="true" />
                )}
                <span>{broadcastFeedback.text}</span>
              </div>
            )}

            <form
              action="/api/broadcast"
              method="POST"
              onSubmit={handlePublishBroadcast}
              noValidate
            >
              <fieldset>
                <legend>Tipo de Comunicado</legend>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="category"
                      value="noticia"
                      checked={postCategory === 'noticia'}
                      onChange={() => setPostCategory('noticia')}
                    />
                    📢 Noticia
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="category"
                      value="alerta"
                      checked={postCategory === 'alerta'}
                      onChange={() => setPostCategory('alerta')}
                    />
                    🚨 Alerta Urgente
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="category"
                      value="academico"
                      checked={postCategory === 'academico'}
                      onChange={() => setPostCategory('academico')}
                    />
                    🎓 Académico
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend>Contenido del Mensaje</legend>

                <div className="form-group">
                  <label htmlFor="post-title" className="field-label">
                    Título de la noticia o alerta (obligatorio)
                  </label>
                  <span id="post-title-hint" className="field-hint">
                    Escribe un titular claro (mínimo 5 caracteres, ej: &quot;Suspensión de actividades turno tarde&quot;).
                  </span>
                  <input
                    type="text"
                    id="post-title"
                    name="title"
                    required
                    minLength={5}
                    maxLength={140}
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    aria-describedby="post-title-hint"
                    enterKeyHint="next"
                  />
                  <div className="error-msg">
                    <span aria-hidden="true">❌ </span>Por favor ingresa un título de al menos 5 caracteres.
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="post-content" className="field-label">
                    Mensaje detallado (obligatorio)
                  </label>
                  <span id="post-content-hint" className="field-hint">
                    Describe los detalles completos que recibirán los estudiantes y el personal en Telegram.
                  </span>
                  <textarea
                    id="post-content"
                    name="content"
                    required
                    minLength={10}
                    maxLength={2000}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    aria-describedby="post-content-hint"
                  />
                  <div className="error-msg">
                    <span aria-hidden="true">❌ </span>Escribe un mensaje con al menos 10 caracteres.
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="post-link" className="field-label">
                    Enlace adicional o circular oficial (opcional)
                  </label>
                  <span id="post-link-hint" className="field-hint">
                    Formato: https://... (opcional, para adjuntar enlace a comunicado o documento).
                  </span>
                  <input
                    type="url"
                    id="post-link"
                    name="linkUrl"
                    value={postLink}
                    onChange={(e) => setPostLink(e.target.value)}
                    aria-describedby="post-link-hint"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="done"
                  />
                  <div className="error-msg">
                    <span aria-hidden="true">❌ </span>Ingresa una dirección URL válida que comience con https:// o http://.
                  </div>
                </div>
              </fieldset>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSendingPost}
              >
                <Send size={18} aria-hidden="true" />
                {isSendingPost
                  ? 'Enviando por Telegram...'
                  : `Publicar y Notificar (${activeSubscribersCount} suscriptores)`}
              </button>
            </form>
          </section>

          {/* Right column: Live Preview + Recent Broadcast History */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <section className="card">
              <h2 className="card-title">
                <Bell size={20} color="#0b57d0" aria-hidden="true" />
                Vista Previa en Telegram
              </h2>
              <p className="card-desc">
                Así verán el mensaje los usuarios suscritos en su teléfono:
              </p>

              <div
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  padding: '1.15rem',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                <div style={{ fontWeight: 700, color: '#fca5a5', marginBottom: '0.5rem' }}>
                  {postCategory === 'alerta'
                    ? '🚨 ALERTA IMPORTANTE — IUJO BARQUISIMETO'
                    : postCategory === 'academico'
                    ? '🎓 AVISO ACADÉMICO — IUJO BARQUISIMETO'
                    : '📢 NOTICIA INSTITUCIONAL — IUJO BARQUISIMETO'}
                </div>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
                  📌 {postTitle || 'Título de tu publicación...'}
                </div>
                <div style={{ color: '#e2e8f0', marginBottom: '0.65rem' }}>
                  {postContent || 'Escribe el contenido para previsualizar el mensaje aquí...'}
                </div>
                {postLink && (
                  <div style={{ color: '#60a5fa', marginBottom: '0.5rem' }}>
                    🔗 Más información / Enlace oficial ({postLink})
                  </div>
                )}
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  🕒 Publicado ahora • Extensión Barquisimeto
                </div>
              </div>
            </section>

            <section className="card">
              <h2 className="card-title">Historial de Envíos Recientes</h2>
              <p className="card-desc">
                Últimas noticias, alertas y reportes sísmicos transmitidos por el bot.
              </p>

              {posts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Aún no has enviado comunicados desde el panel.
                </p>
              ) : (
                <div className="post-list">
                  {posts.slice(0, 6).map((p) => (
                    <article key={p.id} className="post-item">
                      <div className="post-item-header">
                        <span
                          className={`badge ${
                            p.category === 'alerta' || p.category === 'sismo'
                              ? 'red'
                              : p.category === 'academico'
                              ? 'amber'
                              : 'blue'
                          }`}
                        >
                          {p.category.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {new Intl.DateTimeFormat('es-VE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(p.createdAt))}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                        {p.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--text-muted)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        {p.content}
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
                        ✓ Entregado a {p.sentCount} suscriptor(es)
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>
      )}

      {/* TAB 2: SEISMIC MONITOR BARQUISIMETO */}
      {activeTab === 'seismic' && (
        <div className="dashboard-grid">
          <section className="card">
            <h2 className="card-title">
              <ShieldAlert size={22} color="#d32f2f" aria-hidden="true" />
              Configuración de Alerta Sísmica — Sede Barquisimeto
            </h2>
            <p className="card-desc">
              Monitoreo automático centrado en <strong>IUJO Extensión Barquisimeto</strong>{' '}
              (Lat: <code>10.0647</code>, Lon: <code>-69.3570</code>, corredor de la{' '}
              <strong>Falla de Boconó</strong>) combinando las redes sismológicas en tiempo real de{' '}
              <strong>USGS (GeoJSON FDSN)</strong> y <strong>EMSC (SeismicPortal)</strong>.
            </p>

            {seismicFeedback && (
              <div
                className={`feedback-banner ${seismicFeedback.type}`}
                role="status"
                aria-live="polite"
              >
                <AlertTriangle size={20} aria-hidden="true" />
                <span>{seismicFeedback.text}</span>
              </div>
            )}

            <form action="/api/quakes" method="POST" onSubmit={handleSaveSeismicConfig}>
              <fieldset>
                <legend>Parámetros del Umbral Sísmico (Magnitud N)</legend>

                <div className="form-group">
                  <label htmlFor="min-mag-range" className="field-label">
                    Magnitud mínima (N) para disparar alerta en Telegram
                  </label>
                  <span id="min-mag-hint" className="field-hint">
                    Cuando se detecte un sismo con magnitud igual o mayor a N cerca de Barquisimeto, el bot enviará la alerta a todos los suscriptores.
                  </span>
                  <div className="range-slider-row">
                    <input
                      type="range"
                      id="min-mag-range"
                      name="minMagnitude"
                      min={2.5}
                      max={7.5}
                      step={0.1}
                      value={quakeConfig.minMagnitude}
                      onChange={(e) =>
                        setQuakeConfig((prev) => ({
                          ...prev,
                          minMagnitude: Number(e.target.value),
                        }))
                      }
                      aria-describedby="min-mag-hint"
                    />
                    <span className="mag-display-pill">
                      M ≥ {quakeConfig.minMagnitude.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="radius-km" className="field-label">
                    Radio de cobertura desde Barquisimeto (km)
                  </label>
                  <span id="radius-hint" className="field-hint">
                    Recomendado: 250 km (cubre Lara, Yaracuy, Portuguesa, Trujillo y Falla de Boconó).
                  </span>
                  <input
                    type="number"
                    id="radius-km"
                    name="maxRadiusKm"
                    min={50}
                    max={800}
                    step={10}
                    required
                    value={quakeConfig.maxRadiusKm}
                    onChange={(e) =>
                      setQuakeConfig((prev) => ({
                        ...prev,
                        maxRadiusKm: Number(e.target.value),
                      }))
                    }
                    aria-describedby="radius-hint"
                  />
                </div>

                <div className="form-group">
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={quakeConfig.autoAlertTelegram}
                      onChange={(e) =>
                        setQuakeConfig((prev) => ({
                          ...prev,
                          autoAlertTelegram: e.target.checked,
                        }))
                      }
                      style={{ width: '1.2rem', height: '1.2rem', accentColor: '#d32f2f' }}
                    />
                    Enviar alerta automática por Telegram al superar M ≥{' '}
                    {quakeConfig.minMagnitude.toFixed(1)}
                  </label>
                </div>
              </fieldset>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingQuakeConfig}
                >
                  {savingQuakeConfig
                    ? 'Guardando umbral...'
                    : `Guardar Umbral (M ≥ ${quakeConfig.minMagnitude.toFixed(1)})`}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSimulateQuakeAlert}
                  disabled={simulatingQuake}
                >
                  <Radio size={18} color="#d32f2f" aria-hidden="true" />
                  {simulatingQuake
                    ? 'Enviando simulacro...'
                    : `Simular Alerta M ${quakeConfig.minMagnitude.toFixed(1)} en Telegram`}
                </button>
              </div>
            </form>
          </section>

          <section className="card">
            <h2 className="card-title">
              ¿Por qué usamos USGS + EMSC para Barquisimeto?
            </h2>
            <p className="card-desc">
              Arquitectura recomendada para monitoreo sísmico confiable en el Estado Lara:
            </p>
            <ul
              style={{
                margin: 0,
                paddingInlineStart: '1.2rem',
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <li>
                <strong>Cobertura en la Falla de Boconó:</strong> FUNVISIS no ofrece una API REST pública estable. Por ello integramos el servicio estándar internacional{' '}
                <strong>FDSN GeoJSON de USGS</strong> junto con{' '}
                <strong>EMSC (SeismicPortal)</strong>.
              </li>
              <li>
                <strong>Geocercado en Barquisimeto:</strong> Cada evento se filtra con epicentro respecto al campus de{' '}
                <strong>IUJO Barquisimeto (10.0647° N, -69.3570° O)</strong>, calculando la distancia exacta mediante la fórmula de Haversine y la localidad larense más cercana (Cabudare, Quíbor, El Tocuyo, Carora, Duaca, Sarare).
              </li>
              <li>
                <strong>Ejecución en Vercel:</strong> Incluye un Cron Job en{' '}
                <code>vercel.json</code> (<code>/api/quakes/check</code>) y verificación en vivo para disparar el aviso sin duplicar alertas ya enviadas.
              </li>
            </ul>
          </section>

          {/* Full-width Seismic Events Table */}
          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h2 className="card-title">
                  Sismos Detectados en la Región Centro-Occidental / Barquisimeto (Últimos 30 días)
                </h2>
                <p className="card-desc" style={{ marginBottom: 0 }}>
                  Los eventos que igualan o superan tu umbral configurado (
                  <strong>M ≥ {quakeConfig.minMagnitude.toFixed(1)}</strong>) se resaltan como{' '}
                  <strong>ALERTA</strong>.
                </p>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={loadQuakes}
                disabled={loadingQuakes}
              >
                <RefreshCw size={16} aria-hidden="true" />
                {loadingQuakes ? 'Consultando USGS + EMSC...' : 'Actualizar radar sísmico'}
              </button>
            </div>

            <div className="table-wrapper">
              <table
                className="data-table"
                style={
                  {
                    '--label-2': '"Referencia Barquisimeto"',
                    '--label-3': '"Profundidad"',
                    '--label-4': '"Fecha y Hora (VET)"',
                    '--label-5': '"Estado Umbral"',
                  } as React.CSSProperties
                }
              >
                <thead>
                  <tr>
                    <th scope="col">Magnitud</th>
                    <th scope="col">Referencia Barquisimeto</th>
                    <th scope="col">Profundidad</th>
                    <th scope="col">Fecha y Hora (VET)</th>
                    <th scope="col">Estado Umbral</th>
                  </tr>
                </thead>
                <tbody>
                  {quakes.length === 0 ? (
                    <tr>
                      <th scope="row">Sin eventos</th>
                      <td colSpan={4}>
                        {loadingQuakes
                          ? 'Consultando servidores sismológicos USGS y EMSC...'
                          : `No se registran sismos en un radio de ${quakeConfig.maxRadiusKm} km de Barquisimeto en los últimos 30 días. Puedes usar el botón "Simular Alerta" arriba para probar el envío a Telegram.`}
                      </td>
                    </tr>
                  ) : (
                    quakes.map((q) => {
                      const exceeds = q.magnitude >= quakeConfig.minMagnitude;
                      return (
                        <tr key={q.id}>
                          <th scope="row">
                            <span
                              className={`badge ${
                                q.magnitude >= 5.0
                                  ? 'red'
                                  : q.magnitude >= 4.0
                                  ? 'amber'
                                  : 'blue'
                              }`}
                              style={{ fontSize: '0.9rem' }}
                            >
                              M {q.magnitude.toFixed(1)} Mw
                            </span>
                          </th>
                          <td>
                            <div style={{ fontWeight: 600 }}>{q.referenceBqto}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {q.place} • Fuente: {q.source}
                            </div>
                          </td>
                          <td>{q.depthKm} km</td>
                          <td>
                            {new Intl.DateTimeFormat('es-VE', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                              timeZone: 'America/Caracas',
                            }).format(new Date(q.timestamp))}
                          </td>
                          <td>
                            {exceeds ? (
                              <span className="badge red">
                                🚨 SUPERA UMBRAL (M ≥ {quakeConfig.minMagnitude.toFixed(1)})
                              </span>
                            ) : (
                              <span className="badge green">
                                Bajo umbral (&lt; {quakeConfig.minMagnitude.toFixed(1)})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: SUBSCRIBERS LIST */}
      {activeTab === 'subscribers' && (
        <section className="card">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h2 className="card-title">
                <Users size={22} color="#d32f2f" aria-hidden="true" />
                Directorio de Usuarios Suscritos ({activeSubscribersCount} activos de{' '}
                {subscribers.length})
              </h2>
              <p className="card-desc" style={{ marginBottom: 0 }}>
                Cualquier estudiante o docente que abra el bot{' '}
                {botUsername ? (
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontWeight: 700, color: '#d32f2f' }}
                  >
                    @{botUsername}
                  </a>
                ) : (
                  'en Telegram'
                )}{' '}
                y envíe <code>/start</code> aparecerá automáticamente aquí.
              </p>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => loadDashboard(false)}
              disabled={syncing}
            >
              <RefreshCw size={16} aria-hidden="true" />
              {syncing ? 'Actualizando...' : 'Buscar nuevos suscriptores (/start)'}
            </button>
          </div>

          <div className="table-wrapper">
            <table
              className="data-table"
              style={
                {
                  '--label-2': '"Usuario Telegram"',
                  '--label-3': '"Chat ID"',
                  '--label-4': '"Estado"',
                  '--label-5': '"Fecha Suscripción"',
                } as React.CSSProperties
              }
            >
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Usuario Telegram</th>
                  <th scope="col">Chat ID</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha Suscripción</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 ? (
                  <tr>
                    <th scope="row">Sin suscriptores</th>
                    <td colSpan={4}>
                      Aún no hay usuarios registrados. Abre{' '}
                      {botUsername ? (
                        <a
                          href={`https://t.me/${botUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontWeight: 700 }}
                        >
                          https://t.me/{botUsername}
                        </a>
                      ) : (
                        'tu bot en Telegram'
                      )}{' '}
                      y presiona <strong>Iniciar (/start)</strong> para ver cómo se registra en tiempo real.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => (
                    <tr key={sub.chatId}>
                      <th scope="row">
                        {[sub.firstName, sub.lastName].filter(Boolean).join(' ') ||
                          'Usuario Telegram'}
                      </th>
                      <td>{sub.username ? `@${sub.username}` : 'Sin alias público'}</td>
                      <td>
                        <code>{sub.chatId}</code>
                      </td>
                      <td>
                        {sub.active ? (
                          <span className="badge green">🟢 Suscrito Activo</span>
                        ) : (
                          <span className="badge red">🔕 Pausado (/stop)</span>
                        )}
                      </td>
                      <td>
                        {new Intl.DateTimeFormat('es-VE', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(sub.subscribedAt))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: BOT CUSTOMIZATION & VERCEL DEPLOYMENT */}
      {activeTab === 'customize' && (
        <div className="dashboard-grid">
          <section className="card">
            <h2 className="card-title">
              <Sparkles size={20} color="#d32f2f" aria-hidden="true" />
              Personalizar Identidad del Bot en Telegram
            </h2>
            <p className="card-desc">
              Actualiza directamente desde aquí el nombre, la descripción, los comandos y la{' '}
              <strong>foto de perfil oficial de IUJO Extensión Barquisimeto</strong> usando el token de{' '}
              <code>.env</code>.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                marginBottom: '1.25rem',
              }}
            >
              <img
                src="/iujo-logo.jpg"
                alt="Imagen de perfil IUJO Extensión Barquisimeto"
                width={72}
                height={72}
                style={{
                  borderRadius: '50%',
                  border: '2px solid #111827',
                  objectFit: 'cover',
                }}
              />
              <div>
                <div style={{ fontWeight: 700 }}>
                  Imagen lista: Logo IUJO Extensión Barquisimeto (Fe y Alegría)
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Se enviará mediante el método oficial <code>setMyProfilePhoto</code> de Telegram Bot API junto con los textos institucionales.
                </div>
              </div>
            </div>

            {customizeSteps.length > 0 && (
              <div className="feedback-banner info" role="status" aria-live="polite">
                <div>
                  <strong>Resultado de la sincronización con Telegram:</strong>
                  <ul style={{ margin: '0.4rem 0 0', paddingInlineStart: '1.2rem' }}>
                    {customizeSteps.map((s, idx) => (
                      <li key={idx}>
                        {s.ok ? '✅' : '⚠️'} <strong>{s.step}</strong>
                        {s.detail ? ` — ${s.detail}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <form action="/api/bot/customize" method="POST" onSubmit={handleCustomizeBot}>
              <fieldset>
                <legend>Datos del Perfil del Bot</legend>

                <div className="form-group">
                  <label htmlFor="bot-name" className="field-label">
                    Nombre visible del Bot (máx. 64 caracteres)
                  </label>
                  <span id="bot-name-hint" className="field-hint">
                    Nombre que aparece en el encabezado del chat de Telegram.
                  </span>
                  <input
                    type="text"
                    id="bot-name"
                    name="name"
                    required
                    maxLength={64}
                    value={botProfile.name}
                    onChange={(e) =>
                      setBotProfile((prev) => ({ ...prev, name: e.target.value }))
                    }
                    aria-describedby="bot-name-hint"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bot-short-desc" className="field-label">
                    Biografía corta / Acerca de (máx. 120 caracteres)
                  </label>
                  <span id="bot-short-hint" className="field-hint">
                    Aparece al abrir la tarjeta de perfil del bot en Telegram.
                  </span>
                  <input
                    type="text"
                    id="bot-short-desc"
                    name="shortDescription"
                    required
                    maxLength={120}
                    value={botProfile.shortDescription}
                    onChange={(e) =>
                      setBotProfile((prev) => ({
                        ...prev,
                        shortDescription: e.target.value,
                      }))
                    }
                    aria-describedby="bot-short-hint"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bot-desc" className="field-label">
                    Mensaje de bienvenida (&quot;¿Qué puede hacer este bot?&quot;)
                  </label>
                  <span id="bot-desc-hint" className="field-hint">
                    Se muestra a los usuarios antes de presionar el botón Iniciar (/start).
                  </span>
                  <textarea
                    id="bot-desc"
                    name="description"
                    required
                    maxLength={512}
                    value={botProfile.description}
                    onChange={(e) =>
                      setBotProfile((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    aria-describedby="bot-desc-hint"
                  />
                </div>
              </fieldset>

              <button
                type="submit"
                className="btn-primary"
                disabled={isCustomizingBot}
              >
                <Sparkles size={18} aria-hidden="true" />
                {isCustomizingBot
                  ? 'Aplicando foto y perfil en Telegram...'
                  : 'Aplicar Foto IUJO, Nombre y Comandos al Bot'}
              </button>
            </form>
          </section>

          <section className="card">
            <h2 className="card-title">
              Modo Webhook para Producción en Vercel
            </h2>
            <p className="card-desc">
              En tu entorno local el bot funciona por <strong>Polling automático</strong> sin configurar nada. Cuando despliegues en <strong>Vercel</strong>, pega aquí tu dominio de Vercel para activar el Webhook Serverless.
            </p>

            {webhookFeedback && (
              <div className="feedback-banner info" role="status">
                <span>{webhookFeedback}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="webhook-url" className="field-label">
                URL del Webhook (HTTPS en Vercel)
              </label>
              <span id="webhook-hint" className="field-hint">
                Ejemplo: https://tu-proyecto.vercel.app/api/telegram/webhook
              </span>
              <input
                type="url"
                id="webhook-url"
                name="webhookUrl"
                value={webhookUrlInput}
                onChange={(e) => setWebhookUrlInput(e.target.value)}
                aria-describedby="webhook-hint"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleSetWebhook(webhookUrlInput)}
              >
                Activar Webhook en Telegram
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setWebhookUrlInput('');
                  handleSetWebhook('');
                }}
              >
                Usar Modo Local (Polling)
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

