'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  ClipboardPaste,
  ExternalLink,
  ImagePlus,
  LogOut,
  Megaphone,
  Radio,
  RefreshCw,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
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

const inputClasses =
  'w-full min-h-[48px] rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]';

const primaryBtnClasses =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-iujo-red px-5 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-iujo-dark focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] disabled:cursor-not-allowed disabled:opacity-65';

const secondaryBtnClasses =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] disabled:cursor-not-allowed disabled:opacity-60';

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
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [botPhotoFile, setBotPhotoFile] = useState<File | null>(null);
  const [botPhotoPreview, setBotPhotoPreview] = useState<string | null>(null);
  const [isDraggingBotPhoto, setIsDraggingBotPhoto] = useState(false);
  const [botPhotoError, setBotPhotoError] = useState<string | null>(null);
  const botPhotoInputRef = useRef<HTMLInputElement>(null);
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

    const interval = setInterval(() => {
      loadDashboard(true);
    }, 12000);

    const quakeInterval = setInterval(() => {
      loadQuakes();
    }, 90000);

    return () => {
      clearInterval(interval);
      clearInterval(quakeInterval);
    };
  }, [loadDashboard, loadQuakes]);

  const applyImageFile = useCallback(
    (file: File | null, source: 'picker' | 'drop' | 'paste' = 'picker') => {
      setImageError(null);
      if (!file) {
        setPostImageFile(null);
        setPostImagePreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
        setImageError('Formato no soportado. Usa una imagen JPG, PNG o WEBP.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setImageError('La imagen supera el límite máximo permitido de 10 MB.');
        return;
      }

      let normalizedFile = file;
      if (
        source === 'paste' &&
        (!file.name || file.name === 'image.png' || file.name === 'blob')
      ) {
        const ext = file.type.split('/')[1] || 'png';
        const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
        normalizedFile = new File([file], `imagen-pegada-${stamp}.${ext}`, {
          type: file.type || 'image/png',
        });
      }

      setPostImageFile(normalizedFile);
      const objectUrl = URL.createObjectURL(normalizedFile);
      setPostImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });

      if (fileInputRef.current && source !== 'picker') {
        try {
          const dt = new DataTransfer();
          dt.items.add(normalizedFile);
          fileInputRef.current.files = dt.files;
        } catch {
          // Ignore if browser restricts programmatic FileList assignment
        }
      }
    },
    []
  );

  // Convert any image (PNG/WEBP/JPG) into a square 640x640 JPEG required by Telegram setMyProfilePhoto
  const convertImageToSquareJpeg = useCallback(async (file: File, baseName: string): Promise<File> => {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const size = 640;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Center crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = baseName.replace(/\.[^.]+$/, '') + '.jpg';
            resolve(new File([blob], cleanName, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.92
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }, []);

  const applyBotPhotoFile = useCallback(
    async (file: File | null, source: 'picker' | 'drop' | 'paste' = 'picker') => {
      setBotPhotoError(null);
      if (!file) {
        setBotPhotoFile(null);
        setBotPhotoPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
        setBotPhotoError('Formato no soportado. Usa una imagen JPG, PNG o WEBP.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setBotPhotoError('La imagen supera el límite máximo permitido de 10 MB.');
        return;
      }

      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
      const rawName =
        source === 'paste' && (!file.name || file.name === 'image.png' || file.name === 'blob')
          ? `avatar-pegado-${stamp}.jpg`
          : file.name || `avatar-bot-${stamp}.jpg`;

      const jpegFile = await convertImageToSquareJpeg(file, rawName);
      setBotPhotoFile(jpegFile);

      const objectUrl = URL.createObjectURL(jpegFile);
      setBotPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });

      if (botPhotoInputRef.current && source !== 'picker') {
        try {
          const dt = new DataTransfer();
          dt.items.add(jpegFile);
          botPhotoInputRef.current.files = dt.files;
        } catch {
          // Ignore if browser restricts programmatic FileList assignment
        }
      }
    },
    [convertImageToSquareJpeg]
  );

  // Allow pasting images with Ctrl+V / Cmd+V anywhere while on the broadcast or customize tab
  useEffect(() => {
    if (activeTab !== 'broadcast' && activeTab !== 'customize') return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            e.preventDefault();
            if (activeTab === 'customize') {
              void applyBotPhotoFile(pastedFile, 'paste');
            } else {
              applyImageFile(pastedFile, 'paste');
            }
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [activeTab, applyImageFile, applyBotPhotoFile]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    applyImageFile(file, 'picker');
  }

  function handleDragOverImage(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingImage) {
      setIsDraggingImage(true);
    }
  }

  function handleDragLeaveImage(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingImage(false);
    }
  }

  function handleDropImage(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
    const droppedFile = e.dataTransfer?.files?.[0] || null;
    if (droppedFile) {
      applyImageFile(droppedFile, 'drop');
    }
  }

  async function handlePasteFromClipboardButton() {
    setImageError(null);
    if (!navigator.clipboard || !navigator.clipboard.read) {
      setImageError(
        'Tu navegador no permite leer el portapapeles con botón. Presiona Ctrl+V (o Cmd+V) directamente para pegar la imagen.'
      );
      return;
    }
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split('/')[1] || 'png';
          const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
          const file = new File([blob], `imagen-pegada-${stamp}.${ext}`, {
            type: imageType,
          });
          applyImageFile(file, 'paste');
          return;
        }
      }
      setImageError(
        'No se encontró ninguna imagen en el portapapeles. Copia una imagen o captura de pantalla e inténtalo de nuevo.'
      );
    } catch {
      setImageError(
        'Para pegar sin permisos adicionales, presiona Ctrl+V (o Cmd+V) directamente en esta pantalla.'
      );
    }
  }

  function clearSelectedImage() {
    setImageError(null);
    setPostImageFile(null);
    if (postImagePreview) {
      URL.revokeObjectURL(postImagePreview);
    }
    setPostImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

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
      const formData = new FormData();
      formData.append('category', postCategory);
      formData.append('title', postTitle);
      formData.append('content', postContent);
      formData.append('linkUrl', postLink);
      if (postImageFile) {
        formData.append('image', postImageFile);
      }

      const res = await fetch('/api/broadcast', {
        method: 'POST',
        body: formData,
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
          text: `¡Publicación ${
            postImageFile ? 'con imagen ' : ''
          }enviada con éxito a ${data.delivery.sentCount} de ${
            data.delivery.totalTargets
          } suscriptor(es) activos en Telegram!`,
        });
        setPostTitle('');
        setPostContent('');
        setPostLink('');
        clearSelectedImage();
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

  function handleBotPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    void applyBotPhotoFile(file, 'picker');
  }

  function handleDragOverBotPhoto(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingBotPhoto) {
      setIsDraggingBotPhoto(true);
    }
  }

  function handleDragLeaveBotPhoto(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingBotPhoto(false);
    }
  }

  function handleDropBotPhoto(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBotPhoto(false);
    const droppedFile = e.dataTransfer?.files?.[0] || null;
    if (droppedFile) {
      void applyBotPhotoFile(droppedFile, 'drop');
    }
  }

  async function handlePasteBotPhotoButton() {
    setBotPhotoError(null);
    if (!navigator.clipboard || !navigator.clipboard.read) {
      setBotPhotoError(
        'Tu navegador no permite leer el portapapeles con botón. Presiona Ctrl+V (o Cmd+V) directamente para pegar la imagen.'
      );
      return;
    }
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.split('/')[1] || 'png';
          const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
          const file = new File([blob], `avatar-pegado-${stamp}.${ext}`, {
            type: imageType,
          });
          await applyBotPhotoFile(file, 'paste');
          return;
        }
      }
      setBotPhotoError(
        'No se encontró ninguna imagen en el portapapeles. Copia una imagen o captura de pantalla e inténtalo de nuevo.'
      );
    } catch {
      setBotPhotoError(
        'Para pegar sin permisos adicionales, presiona Ctrl+V (o Cmd+V) directamente en esta pantalla.'
      );
    }
  }

  function clearSelectedBotPhoto() {
    setBotPhotoError(null);
    setBotPhotoFile(null);
    if (botPhotoPreview) {
      URL.revokeObjectURL(botPhotoPreview);
    }
    setBotPhotoPreview(null);
    if (botPhotoInputRef.current) {
      botPhotoInputRef.current.value = '';
    }
  }

  async function handleCustomizeBot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsCustomizingBot(true);
    setCustomizeSteps([]);
    try {
      const formData = new FormData();
      formData.append('name', botProfile.name);
      formData.append('shortDescription', botProfile.shortDescription);
      formData.append('description', botProfile.description);
      if (botPhotoFile) {
        formData.append('photo', botPhotoFile);
      }

      const res = await fetch('/api/bot/customize', {
        method: 'POST',
        body: formData,
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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/login';
  }

  const activeSubscribersCount = subscribers.filter((s) => s.active).length;
  const botUsername = botStatus.bot?.username || botProfile.username;

  return (
    <div className="mx-auto max-w-7xl px-5 pt-6 pb-14" ref={rootRef}>
      {/* Top Institutional Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 px-7 py-5 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src="/iujo-logo.jpg"
            alt="Logo IUJO Extensión Barquisimeto - Fe y Alegría"
            className="h-16 w-16 shrink-0 rounded-full border-2 border-white bg-white object-cover"
            width={64}
            height={64}
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              IUJO Extensión Barquisimeto — Centro de Notificaciones y Alerta Sísmica
            </h1>
            <p className="mt-1 text-sm text-slate-200">
              Instituto Universitario Jesús Obrero (Fe y Alegría) • Gestión de Bot de Telegram y Monitoreo Sísmico en Lara
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-semibold sm:text-sm"
            aria-live="polite"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                botStatus.connected
                  ? 'bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.25)]'
                  : 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.25)]'
              }`}
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
              className={secondaryBtnClasses}
            >
              <ExternalLink size={16} aria-hidden="true" />
              Abrir @{botUsername}
            </a>
          )}

          <button
            type="button"
            className={secondaryBtnClasses}
            onClick={() => {
              loadDashboard(false);
              loadQuakes();
            }}
            disabled={syncing}
          >
            <RefreshCw
              size={16}
              className={syncing ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>

          <button
            type="button"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] border border-white/30 bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]"
            onClick={handleLogout}
          >
            <LogOut size={16} aria-hidden="true" />
            Salir
          </button>
        </div>
      </header>

      {/* KPI Summary Cards */}
      <section
        className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Métricas principales del sistema"
      >
        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 border-l-[5px] border-l-iujo-red bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <Users size={18} className="text-iujo-red" aria-hidden="true" />
            Usuarios Suscritos Activos
          </span>
          <span className="text-3xl font-extrabold text-slate-900">
            {activeSubscribersCount}
          </span>
          <span className="text-xs text-slate-600">
            {subscribers.length} registrados en total (vía comando /start)
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <Activity size={18} className="text-amber-600" aria-hidden="true" />
            Alerta Sísmica Barquisimeto
          </span>
          <span className="text-3xl font-extrabold text-slate-900">
            M ≥ {quakeConfig.minMagnitude.toFixed(1)}
          </span>
          <span className="text-xs text-slate-600">
            Radio: {quakeConfig.maxRadiusKm} km desde sede IUJO Barquisimeto
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <Megaphone size={18} className="text-blue-700" aria-hidden="true" />
            Boletines y Alertas Enviadas
          </span>
          <span className="text-3xl font-extrabold text-slate-900">{posts.length}</span>
          <span className="text-xs text-slate-600">
            Noticias institucionales, avisos y reportes sísmicos
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <Bot size={18} className="text-green-700" aria-hidden="true" />
            Modo de Recepción Telegram
          </span>
          <span className="text-2xl font-extrabold text-slate-900">
            {botStatus.webhook?.url ? 'Webhook (Vercel)' : 'Polling Activo'}
          </span>
          <span className="text-xs text-slate-600">
            {botStatus.connected
              ? `ID: ${botStatus.bot?.id} • Listo para enviar`
              : botStatus.error || 'Verificando token en .env'}
          </span>
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav
        className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3"
        aria-label="Secciones del panel"
      >
        {(
          [
            {
              id: 'broadcast',
              label: 'Publicar Noticia / Alerta',
              icon: <Megaphone size={18} aria-hidden="true" />,
            },
            {
              id: 'seismic',
              label: `Monitor Sísmico Barquisimeto (M ≥ ${quakeConfig.minMagnitude.toFixed(
                1
              )})`,
              icon: <Activity size={18} aria-hidden="true" />,
            },
            {
              id: 'subscribers',
              label: `Usuarios Suscritos (${activeSubscribersCount})`,
              icon: <Users size={18} aria-hidden="true" />,
            },
            {
              id: 'customize',
              label: 'Personalizar Bot y Despliegue Vercel',
              icon: <Settings size={18} aria-hidden="true" />,
            },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-[48px] items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] ${
                isActive
                  ? 'bg-iujo-red text-white shadow-md shadow-red-600/25'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* TAB 1: PUBLISH NEWS OR ALERTS */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Send size={20} className="text-iujo-red" aria-hidden="true" />
              Enviar Noticia o Alerta a la Comunidad IUJO
            </h2>
            <p className="mb-5 text-sm text-slate-600">
              Redacta un comunicado o alerta. Se enviará inmediatamente por Telegram a los{' '}
              <strong className="text-slate-900">
                {activeSubscribersCount} usuario(s) suscritos
              </strong>
              .
            </p>

            {broadcastFeedback && (
              <div
                className={`mb-5 flex items-start gap-2.5 rounded-[10px] border p-3.5 text-sm font-medium ${
                  broadcastFeedback.type === 'success'
                    ? 'border-green-300 bg-green-50 text-green-900'
                    : 'border-red-300 bg-red-50 text-red-900'
                }`}
                role="status"
                aria-live="polite"
              >
                {broadcastFeedback.type === 'success' ? (
                  <CheckCircle2 size={20} className="shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle size={20} className="shrink-0" aria-hidden="true" />
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
              <fieldset className="mb-5 rounded-[10px] border border-slate-200 p-4">
                <legend className="px-2 text-sm font-bold text-slate-900">
                  Tipo de Comunicado
                </legend>
                <div className="mt-1 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {(
                    [
                      { value: 'noticia', label: '📢 Noticia' },
                      { value: 'alerta', label: '🚨 Alerta Urgente' },
                      { value: 'academico', label: '🎓 Académico' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex min-h-[48px] cursor-pointer items-center gap-2.5 rounded-[10px] border-[1.5px] px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                        postCategory === opt.value
                          ? 'border-iujo-red bg-iujo-soft text-iujo-dark'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={opt.value}
                        checked={postCategory === opt.value}
                        onChange={() => setPostCategory(opt.value)}
                        className="h-4 w-4 accent-iujo-red"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mb-5 rounded-[10px] border border-slate-200 p-4">
                <legend className="px-2 text-sm font-bold text-slate-900">
                  Contenido del Mensaje
                </legend>

                {/* Gestalt Proximity Rule: small margin between label/hint and input, larger margin (mb-6) between form groups */}
                <div className="mb-6">
                  <label
                    htmlFor="post-title"
                    className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                  >
                    Título de la noticia o alerta (obligatorio)
                  </label>
                  <span
                    id="post-title-hint"
                    className="mb-1.5 block text-xs text-slate-600"
                  >
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
                    className={inputClasses}
                  />
                  <div className="error-msg">
                    <span aria-hidden="true">❌ </span>Por favor ingresa un título de al menos 5 caracteres.
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="post-content"
                    className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                  >
                    Mensaje detallado (obligatorio)
                  </label>
                  <span
                    id="post-content-hint"
                    className="mb-1.5 block text-xs text-slate-600"
                  >
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
                    className={`${inputClasses} min-h-[120px] resize-y`}
                  />
                  <div className="error-msg">
                    <span aria-hidden="true">❌ </span>Escribe un mensaje con al menos 10 caracteres.
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="post-image"
                    className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                  >
                    Imagen del comunicado o afiche (opcional)
                  </label>
                  <span
                    id="post-image-hint"
                    className="mb-2 block text-xs text-slate-600"
                  >
                    Arrastra y suelta una imagen aquí, pégala con{' '}
                    <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-slate-800">
                      Ctrl+V
                    </kbd>{' '}
                    o selecciónala desde tu dispositivo (JPG, PNG o WEBP, máx. 10 MB).
                  </span>

                  <div
                    onDragEnter={handleDragOverImage}
                    onDragOver={handleDragOverImage}
                    onDragLeave={handleDragLeaveImage}
                    onDrop={handleDropImage}
                    className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                      isDraggingImage
                        ? 'border-iujo-red bg-red-50/70'
                        : 'border-slate-300 bg-slate-50/60 hover:border-slate-400'
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-3 text-xs text-slate-700">
                      <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                          isDraggingImage
                            ? 'border-iujo-red bg-white text-iujo-red'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                        aria-hidden="true"
                      >
                        <Upload size={18} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {isDraggingImage
                            ? '¡Suelta la imagen aquí para adjuntarla!'
                            : 'Arrastra y suelta tu imagen aquí o pégala con Ctrl+V'}
                        </p>
                        <p className="text-slate-600">
                          También puedes usar los botones de abajo para elegir un archivo o pegar desde el portapapeles.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="post-image"
                        name="image"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        aria-describedby="post-image-hint"
                        className="block flex-1 text-sm text-slate-700 file:mr-3 file:min-h-[48px] file:cursor-pointer file:rounded-[10px] file:border file:border-slate-300 file:bg-white file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-900 hover:file:bg-slate-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]"
                      />
                      <button
                        type="button"
                        onClick={handlePasteFromClipboardButton}
                        className={secondaryBtnClasses}
                      >
                        <ClipboardPaste size={16} aria-hidden="true" />
                        Pegar imagen
                      </button>
                    </div>
                  </div>

                  {imageError && (
                    <div
                      className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900"
                      role="status"
                      aria-live="polite"
                    >
                      <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
                      <span>{imageError}</span>
                    </div>
                  )}

                  {postImagePreview && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={postImagePreview}
                          alt="Vista previa de imagen seleccionada"
                          className="h-14 w-14 rounded-lg border border-slate-300 object-cover"
                        />
                        <div className="text-xs">
                          <div className="font-bold text-slate-900">
                            {postImageFile?.name}
                          </div>
                          <div className="text-slate-600">
                            {postImageFile
                              ? `${(postImageFile.size / 1024).toFixed(1)} KB`
                              : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearSelectedImage}
                        className="inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Quitar imagen
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="post-link"
                    className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                  >
                    Enlace adicional o circular oficial (opcional)
                  </label>
                  <span
                    id="post-link-hint"
                    className="mb-1.5 block text-xs text-slate-600"
                  >
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
                    className={inputClasses}
                  />
                  <div className="error-msg">
                    <span aria-hidden="true">❌ </span>Ingresa una dirección URL válida que comience con https:// o http://.
                  </div>
                </div>
              </fieldset>

              <button
                type="submit"
                className={primaryBtnClasses}
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
          <aside className="flex flex-col gap-6 lg:col-span-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Bell size={20} className="text-blue-700" aria-hidden="true" />
                Vista Previa en Telegram
              </h2>
              <p className="mb-4 text-sm text-slate-600">
                Así verán el mensaje los usuarios suscritos en su teléfono:
              </p>

              <div className="whitespace-pre-wrap rounded-xl bg-slate-800 p-4 text-sm leading-relaxed text-slate-50">
                {postImagePreview && (
                  <div className="mb-3 overflow-hidden rounded-lg border border-slate-700">
                    <img
                      src={postImagePreview}
                      alt="Imagen que se enviará por Telegram"
                      className="max-h-56 w-full object-cover"
                    />
                  </div>
                )}
                <div className="mb-2 font-bold text-red-300">
                  {postCategory === 'alerta'
                    ? '🚨 ALERTA IMPORTANTE — IUJO BARQUISIMETO'
                    : postCategory === 'academico'
                    ? '🎓 AVISO ACADÉMICO — IUJO BARQUISIMETO'
                    : '📢 NOTICIA INSTITUCIONAL — IUJO BARQUISIMETO'}
                </div>
                <div className="mb-2 font-bold">
                  📌 {postTitle || 'Título de tu publicación...'}
                </div>
                <div className="mb-2.5 text-slate-200">
                  {postContent ||
                    'Escribe el contenido para previsualizar el mensaje aquí...'}
                </div>
                {postLink && (
                  <div className="mb-2 text-blue-400">
                    🔗 Más información / Enlace oficial ({postLink})
                  </div>
                )}
                <div className="text-xs text-slate-400">
                  🕒 Publicado ahora • Extensión Barquisimeto
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-bold text-slate-900">
                Historial de Envíos Recientes
              </h2>
              <p className="mb-4 text-sm text-slate-600">
                Últimas noticias, alertas y reportes sísmicos transmitidos por el bot.
              </p>

              {posts.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Aún no has enviado comunicados desde el panel.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {posts.slice(0, 6).map((p) => (
                    <article
                      key={p.id}
                      className="rounded-[10px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              p.category === 'alerta' || p.category === 'sismo'
                                ? 'bg-red-100 text-red-900'
                                : p.category === 'academico'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {p.category.toUpperCase()}
                          </span>
                          {p.hasImage && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-900">
                              <ImagePlus size={12} aria-hidden="true" />
                              Imagen
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-600">
                          {new Intl.DateTimeFormat('es-VE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(p.createdAt))}
                        </span>
                      </div>
                      <div className="mb-1 font-bold text-slate-900">{p.title}</div>
                      <div className="mb-2 text-sm text-slate-600">{p.content}</div>
                      <div className="text-xs font-semibold text-green-800">
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
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              <ShieldAlert size={22} className="text-iujo-red" aria-hidden="true" />
              Configuración de Alerta Sísmica — Sede Barquisimeto
            </h2>
            <p className="mb-5 text-sm text-slate-600">
              Monitoreo automático centrado en{' '}
              <strong className="text-slate-900">IUJO Extensión Barquisimeto</strong> (Lat:{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">10.0647</code>, Lon:{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">-69.3570</code>,
              corredor de la <strong className="text-slate-900">Falla de Boconó</strong>)
              combinando las redes sismológicas en tiempo real de{' '}
              <strong className="text-slate-900">USGS (GeoJSON FDSN)</strong> y{' '}
              <strong className="text-slate-900">EMSC (SeismicPortal)</strong>.
            </p>

            {seismicFeedback && (
              <div
                className={`mb-5 flex items-start gap-2.5 rounded-[10px] border p-3.5 text-sm font-medium ${
                  seismicFeedback.type === 'success'
                    ? 'border-green-300 bg-green-50 text-green-900'
                    : seismicFeedback.type === 'error'
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : 'border-blue-300 bg-blue-50 text-blue-900'
                }`}
                role="status"
                aria-live="polite"
              >
                <AlertTriangle size={20} className="shrink-0" aria-hidden="true" />
                <span>{seismicFeedback.text}</span>
              </div>
            )}

            <form action="/api/quakes" method="POST" onSubmit={handleSaveSeismicConfig}>
              <fieldset className="mb-5 rounded-[10px] border border-slate-200 p-4">
                <legend className="px-2 text-sm font-bold text-slate-900">
                  Parámetros del Umbral Sísmico (Magnitud N)
                </legend>

                <div className="mb-6">
                  <label
                    htmlFor="min-mag-range"
                    className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                  >
                    Magnitud mínima (N) para disparar alerta en Telegram
                  </label>
                  <span
                    id="min-mag-hint"
                    className="mb-2 block text-xs text-slate-600"
                  >
                    Cuando se detecte un sismo con magnitud igual o mayor a N cerca de Barquisimeto, el bot enviará la alerta a todos los suscriptores.
                  </span>
                  <div className="flex items-center gap-4">
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
                      className="h-2 flex-1 cursor-pointer accent-iujo-red"
                    />
                    <span className="min-w-[96px] rounded-[10px] border-2 border-iujo-red bg-iujo-soft px-3.5 py-1.5 text-center text-xl font-extrabold text-iujo-dark">
                      M ≥ {quakeConfig.minMagnitude.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="radius-km"
                    className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                  >
                    Radio de cobertura desde Barquisimeto (km)
                  </label>
                  <span
                    id="radius-hint"
                    className="mb-1.5 block text-xs text-slate-600"
                  >
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
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-900">
                    <input
                      type="checkbox"
                      checked={quakeConfig.autoAlertTelegram}
                      onChange={(e) =>
                        setQuakeConfig((prev) => ({
                          ...prev,
                          autoAlertTelegram: e.target.checked,
                        }))
                      }
                      className="h-5 w-5 accent-iujo-red"
                    />
                    Enviar alerta automática por Telegram al superar M ≥{' '}
                    {quakeConfig.minMagnitude.toFixed(1)}
                  </label>
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className={primaryBtnClasses}
                  disabled={savingQuakeConfig}
                >
                  {savingQuakeConfig
                    ? 'Guardando umbral...'
                    : `Guardar Umbral (M ≥ ${quakeConfig.minMagnitude.toFixed(1)})`}
                </button>

                <button
                  type="button"
                  className={secondaryBtnClasses}
                  onClick={handleSimulateQuakeAlert}
                  disabled={simulatingQuake}
                >
                  <Radio size={18} className="text-iujo-red" aria-hidden="true" />
                  {simulatingQuake
                    ? 'Enviando simulacro...'
                    : `Simular Alerta M ${quakeConfig.minMagnitude.toFixed(
                        1
                      )} en Telegram`}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              ¿Por qué usamos USGS + EMSC para Barquisimeto?
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              Arquitectura recomendada para monitoreo sísmico confiable en el Estado Lara:
            </p>
            <ul className="list-disc space-y-2.5 pl-5 text-sm text-slate-800">
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
                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                  vercel.json
                </code>{' '}
                (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/api/quakes/check</code>) y verificación en vivo para disparar el aviso sin duplicar alertas ya enviadas.
              </li>
            </ul>
          </section>

          {/* Full-width Seismic Events Table */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Sismos Detectados en la Región Centro-Occidental / Barquisimeto (Últimos 30 días)
                </h2>
                <p className="text-sm text-slate-600">
                  Los eventos que igualan o superan tu umbral configurado (
                  <strong>M ≥ {quakeConfig.minMagnitude.toFixed(1)}</strong>) se resaltan como{' '}
                  <strong>ALERTA</strong>.
                </p>
              </div>

              <button
                type="button"
                className={secondaryBtnClasses}
                onClick={loadQuakes}
                disabled={loadingQuakes}
              >
                <RefreshCw
                  size={16}
                  className={loadingQuakes ? 'animate-spin' : ''}
                  aria-hidden="true"
                />
                {loadingQuakes ? 'Consultando USGS + EMSC...' : 'Actualizar radar sísmico'}
              </button>
            </div>

            <div className="table-wrapper rounded-[10px] border border-slate-200">
              <table
                className="data-table w-full border-separate border-spacing-0 text-sm"
                style={
                  {
                    '--label-2': '"Referencia Barquisimeto"',
                    '--label-3': '"Profundidad"',
                    '--label-4': '"Fecha y Hora (VET)"',
                    '--label-5': '"Estado Umbral"',
                  } as React.CSSProperties
                }
              >
                <thead className="sticky top-0 z-10 bg-slate-100">
                  <tr>
                    <th
                      scope="col"
                      className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Magnitud
                    </th>
                    <th
                      scope="col"
                      className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Referencia Barquisimeto
                    </th>
                    <th
                      scope="col"
                      className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Profundidad
                    </th>
                    <th
                      scope="col"
                      className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Fecha y Hora (VET)
                    </th>
                    <th
                      scope="col"
                      className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Estado Umbral
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quakes.length === 0 ? (
                    <tr>
                      <th
                        scope="row"
                        className="sticky left-0 z-[1] border-b border-slate-200 bg-white px-4 py-3 text-left font-bold text-slate-900"
                      >
                        Sin eventos
                      </th>
                      <td
                        colSpan={4}
                        className="border-b border-slate-200 px-4 py-3 text-slate-600"
                      >
                        {loadingQuakes
                          ? 'Consultando servidores sismológicos USGS y EMSC...'
                          : `No se registran sismos en un radio de ${quakeConfig.maxRadiusKm} km de Barquisimeto en los últimos 30 días. Puedes usar el botón "Simular Alerta" arriba para probar el envío a Telegram.`}
                      </td>
                    </tr>
                  ) : (
                    quakes.map((q) => {
                      const exceeds = q.magnitude >= quakeConfig.minMagnitude;
                      return (
                        <tr key={q.id} className="hover:bg-slate-50">
                          <th
                            scope="row"
                            className="sticky left-0 z-[1] border-b border-slate-200 bg-white px-4 py-3 text-left font-bold text-slate-900"
                          >
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                                q.magnitude >= 5.0
                                  ? 'bg-red-100 text-red-900'
                                  : q.magnitude >= 4.0
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-blue-100 text-blue-900'
                              }`}
                            >
                              M {q.magnitude.toFixed(1)} Mw
                            </span>
                          </th>
                          <td className="border-b border-slate-200 px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              {q.referenceBqto}
                            </div>
                            <div className="text-xs text-slate-600">
                              {q.place} • Fuente: {q.source}
                            </div>
                          </td>
                          <td className="border-b border-slate-200 px-4 py-3">
                            {q.depthKm} km
                          </td>
                          <td className="border-b border-slate-200 px-4 py-3">
                            {new Intl.DateTimeFormat('es-VE', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                              timeZone: 'America/Caracas',
                            }).format(new Date(q.timestamp))}
                          </td>
                          <td className="border-b border-slate-200 px-4 py-3">
                            {exceeds ? (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-900">
                                🚨 SUPERA UMBRAL (M ≥ {quakeConfig.minMagnitude.toFixed(1)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-900">
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Users size={22} className="text-iujo-red" aria-hidden="true" />
                Directorio de Usuarios Suscritos ({activeSubscribersCount} activos de{' '}
                {subscribers.length})
              </h2>
              <p className="text-sm text-slate-600">
                Cualquier estudiante o docente que abra el bot{' '}
                {botUsername ? (
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-iujo-red underline"
                  >
                    @{botUsername}
                  </a>
                ) : (
                  'en Telegram'
                )}{' '}
                y envíe{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/start</code>{' '}
                aparecerá automáticamente aquí.
              </p>
            </div>

            <button
              type="button"
              className={secondaryBtnClasses}
              onClick={() => loadDashboard(false)}
              disabled={syncing}
            >
              <RefreshCw
                size={16}
                className={syncing ? 'animate-spin' : ''}
                aria-hidden="true"
              />
              {syncing ? 'Actualizando...' : 'Buscar nuevos suscriptores (/start)'}
            </button>
          </div>

          <div className="table-wrapper rounded-[10px] border border-slate-200">
            <table
              className="data-table w-full border-separate border-spacing-0 text-sm"
              style={
                {
                  '--label-2': '"Usuario Telegram"',
                  '--label-3': '"Chat ID"',
                  '--label-4': '"Estado"',
                  '--label-5': '"Fecha Suscripción"',
                } as React.CSSProperties
              }
            >
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <th
                    scope="col"
                    className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Usuario Telegram
                  </th>
                  <th
                    scope="col"
                    className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Chat ID
                  </th>
                  <th
                    scope="col"
                    className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Fecha Suscripción
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 ? (
                  <tr>
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] border-b border-slate-200 bg-white px-4 py-3 text-left font-bold text-slate-900"
                    >
                      Sin suscriptores
                    </th>
                    <td
                      colSpan={4}
                      className="border-b border-slate-200 px-4 py-3 text-slate-600"
                    >
                      Aún no hay usuarios registrados. Abre{' '}
                      {botUsername ? (
                        <a
                          href={`https://t.me/${botUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-iujo-red underline"
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
                    <tr key={sub.chatId} className="hover:bg-slate-50">
                      <th
                        scope="row"
                        className="sticky left-0 z-[1] border-b border-slate-200 bg-white px-4 py-3 text-left font-bold text-slate-900"
                      >
                        {[sub.firstName, sub.lastName].filter(Boolean).join(' ') ||
                          'Usuario Telegram'}
                      </th>
                      <td className="border-b border-slate-200 px-4 py-3">
                        {sub.username ? `@${sub.username}` : 'Sin alias público'}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                          {sub.chatId}
                        </code>
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        {sub.active ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-900">
                            🟢 Suscrito Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-900">
                            🔕 Pausado (/stop)
                          </span>
                        )}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
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
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Sparkles size={20} className="text-iujo-red" aria-hidden="true" />
              Personalizar Identidad del Bot en Telegram
            </h2>
            <p className="mb-5 text-sm text-slate-600">
              Actualiza directamente desde aquí el nombre, la descripción, los comandos y la{' '}
              <strong className="text-slate-900">
                foto de perfil oficial de IUJO Extensión Barquisimeto
              </strong>{' '}
              usando el token de{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">.env</code>.
            </p>

            {customizeSteps.length > 0 && (
              <div
                className="mb-5 rounded-[10px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
                role="status"
                aria-live="polite"
              >
                <strong>Resultado de la sincronización con Telegram:</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {customizeSteps.map((s, idx) => (
                    <li key={idx}>
                      {s.ok ? '✅' : '⚠️'} <strong>{s.step}</strong>
                      {s.detail ? ` — ${s.detail}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form action="/api/bot/customize" method="POST" onSubmit={handleCustomizeBot}>
              <fieldset className="mb-5 rounded-[10px] border border-slate-200 p-4">
                <legend className="px-2 text-sm font-bold text-slate-900">
                  Foto de Perfil del Bot en Telegram
                </legend>

                <label
                  htmlFor="bot-photo"
                  className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                >
                  Cambiar imagen o logo del Bot (opcional)
                </label>
                <span
                  id="bot-photo-hint"
                  className="mb-2 block text-xs text-slate-600"
                >
                  Arrastra y suelta una imagen aquí, pégala con{' '}
                  <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-slate-800">
                    Ctrl+V
                  </kbd>{' '}
                  o selecciónala desde tu equipo. Se enviará mediante{' '}
                  <code className="rounded bg-slate-200 px-1 py-0.5">setMyProfilePhoto</code>.
                </span>

                <div
                  onDragEnter={handleDragOverBotPhoto}
                  onDragOver={handleDragOverBotPhoto}
                  onDragLeave={handleDragLeaveBotPhoto}
                  onDrop={handleDropBotPhoto}
                  className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
                    isDraggingBotPhoto
                      ? 'border-iujo-red bg-red-50/70'
                      : 'border-slate-300 bg-slate-50/70 hover:border-slate-400'
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={botPhotoPreview || '/iujo-logo.jpg'}
                        alt="Vista previa de foto de perfil del Bot"
                        width={72}
                        height={72}
                        className="h-[72px] w-[72px] shrink-0 rounded-full border-2 border-slate-900 bg-white object-cover shadow-sm"
                      />
                      <div>
                        <div className="font-bold text-slate-900">
                          {isDraggingBotPhoto
                            ? '¡Suelta la imagen aquí para usarla como foto de perfil!'
                            : botPhotoFile
                            ? `Nueva foto seleccionada: ${botPhotoFile.name}`
                            : 'Imagen actual: Logo IUJO Extensión Barquisimeto (Por defecto)'}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-600">
                          {botPhotoFile
                            ? `Tamaño optimizado para Telegram: ${(
                                botPhotoFile.size / 1024
                              ).toFixed(1)} KB (JPG 640×640)`
                            : 'Arrastra otra imagen aquí, presiona Ctrl+V para pegar desde el portapapeles o elige un archivo abajo.'}
                        </div>
                      </div>
                    </div>

                    {botPhotoFile && (
                      <button
                        type="button"
                        onClick={clearSelectedBotPhoto}
                        className="inline-flex min-h-[48px] items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Restaurar logo IUJO
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={botPhotoInputRef}
                      type="file"
                      id="bot-photo"
                      name="photo"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleBotPhotoChange}
                      aria-describedby="bot-photo-hint"
                      className="block flex-1 text-sm text-slate-700 file:mr-3 file:min-h-[48px] file:cursor-pointer file:rounded-[10px] file:border file:border-slate-300 file:bg-white file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-900 hover:file:bg-slate-100 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]"
                    />
                    <button
                      type="button"
                      onClick={handlePasteBotPhotoButton}
                      className={secondaryBtnClasses}
                    >
                      <ClipboardPaste size={16} aria-hidden="true" />
                      Pegar imagen
                    </button>
                  </div>
                </div>

                {botPhotoError && (
                  <div
                    className="mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900"
                    role="status"
                    aria-live="polite"
                  >
                    <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
                    <span>{botPhotoError}</span>
                  </div>
                )}
              </fieldset>

              <fieldset className="mb-5 rounded-[10px] border border-slate-200 p-4">
                <legend className="px-2 text-sm font-bold text-slate-900">
                  Datos del Perfil del Bot
                </legend>

                <div className="mb-6">
                  <label
                    htmlFor="bot-name"
                    className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                  >
                    Nombre visible del Bot (máx. 64 caracteres)
                  </label>
                  <span
                    id="bot-name-hint"
                    className="mb-1.5 block text-xs text-slate-600"
                  >
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
                    className={inputClasses}
                  />
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="bot-short-desc"
                    className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                  >
                    Biografía corta / Acerca de (máx. 120 caracteres)
                  </label>
                  <span
                    id="bot-short-hint"
                    className="mb-1.5 block text-xs text-slate-600"
                  >
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
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label
                    htmlFor="bot-desc"
                    className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
                  >
                    Mensaje de bienvenida (&quot;¿Qué puede hacer este bot?&quot;)
                  </label>
                  <span
                    id="bot-desc-hint"
                    className="mb-1.5 block text-xs text-slate-600"
                  >
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
                    className={`${inputClasses} min-h-[120px] resize-y`}
                  />
                </div>
              </fieldset>

              <fieldset className="mb-5 rounded-[10px] border border-slate-200 p-4">
                <legend className="px-2 text-sm font-bold text-slate-900">
                  Menú de Comandos Registrados en Telegram (setMyCommands)
                </legend>
                <p className="mb-3 text-xs text-slate-600">
                  Estos comandos aparecen al pulsar el botón <strong>Menú (/)</strong> dentro del chat del bot en Telegram:
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    {
                      cmd: '/start',
                      desc: 'Suscribirme a noticias y alertas de IUJO Barquisimeto',
                    },
                    {
                      cmd: '/guia',
                      desc: 'Qué hacer antes, durante, después y en pisos altos',
                    },
                    {
                      cmd: '/pisosaltos',
                      desc: 'Protocolo sísmico en pisos altos (IUJO / edificios)',
                    },
                    {
                      cmd: '/sismos',
                      desc: 'Ver últimos sismos cercanos a Barquisimeto',
                    },
                    {
                      cmd: '/emergencias',
                      desc: 'Directorio de emergencias en Barquisimeto y Lara',
                    },
                    {
                      cmd: '/estado',
                      desc: 'Consultar estado de mi suscripción',
                    },
                    {
                      cmd: '/stop',
                      desc: 'Pausar notificaciones del bot',
                    },
                    {
                      cmd: '/ayuda',
                      desc: 'Información de contacto y comandos',
                    },
                  ].map((item) => (
                    <div
                      key={item.cmd}
                      className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <code className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 font-bold text-iujo-dark">
                        {item.cmd}
                      </code>
                      <span className="text-slate-700">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                className={primaryBtnClasses}
                disabled={isCustomizingBot}
              >
                <Sparkles size={18} aria-hidden="true" />
                {isCustomizingBot
                  ? 'Aplicando foto y perfil en Telegram...'
                  : 'Aplicar Foto IUJO, Nombre y Comandos al Bot'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
            <h2 className="mb-1 text-lg font-bold text-slate-900">
              Modo Webhook para Producción en Vercel
            </h2>
            <p className="mb-5 text-sm text-slate-600">
              En tu entorno local el bot funciona por{' '}
              <strong className="text-slate-900">Polling automático</strong> sin configurar nada. Cuando despliegues en <strong className="text-slate-900">Vercel</strong>, pega aquí tu dominio de Vercel para activar el Webhook Serverless.
            </p>

            {webhookFeedback && (
              <div
                className="mb-4 rounded-[10px] border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-900"
                role="status"
              >
                <span>{webhookFeedback}</span>
              </div>
            )}

            <div className="mb-5">
              <label
                htmlFor="webhook-url"
                className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
              >
                URL del Webhook (HTTPS en Vercel)
              </label>
              <span
                id="webhook-hint"
                className="mb-1.5 block text-xs text-slate-600"
              >
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
                className={inputClasses}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={primaryBtnClasses}
                onClick={() => handleSetWebhook(webhookUrlInput)}
              >
                Activar Webhook en Telegram
              </button>

              <button
                type="button"
                className={secondaryBtnClasses}
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
