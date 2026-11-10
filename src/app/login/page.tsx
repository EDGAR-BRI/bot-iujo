'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Eye, EyeOff, Lock, LogIn } from 'lucide-react';

const inputClasses =
  'w-full min-h-[48px] rounded-[10px] border-[1.5px] border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0]';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      firstInvalid?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || 'Credenciales inválidas.');
        setIsSubmitting(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setErrorMsg('No se pudo conectar con el servidor.');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-slate-900 via-slate-800 to-red-950 px-4 pt-8 pb-12 sm:justify-center sm:pt-0">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        {/* Keep header compact at top so mobile keyboards do not obstruct inputs and Sign In button */}
        <div className="mb-5 flex items-center gap-3.5">
          <img
            src="/iujo-logo.jpg"
            alt="Logo IUJO Extensión Barquisimeto"
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full border-2 border-slate-900 object-cover"
          />
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">
              Acceso al Panel IUJO
            </h1>
            <p className="text-xs font-medium text-slate-600">
              Extensión Barquisimeto • Bot de Alertas y Sismos
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-red-300 bg-red-50 p-3.5 text-sm font-medium text-red-900"
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form action="/api/auth/login" method="POST" onSubmit={handleLogin}>
          <div className="mb-5">
            <label
              htmlFor="username"
              className="mb-1 inline-block py-1 text-sm font-semibold text-slate-900"
            >
              Usuario o correo institucional
            </label>
            <span id="username-hint" className="mb-1.5 block text-xs text-slate-600">
              Ingresa tu usuario administrador (ej: admin o admin@iujo.edu.ve).
            </span>
            <input
              type="text"
              id="username"
              name="username"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="next"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-describedby="username-hint"
              className={inputClasses}
            />
          </div>

          <div className="mb-6">
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="current-password"
                className="inline-block py-1 text-sm font-semibold text-slate-900"
              >
                Contraseña
              </label>

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-describedby="toggle-warning"
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0]"
              >
                {showPassword ? (
                  <>
                    <EyeOff size={15} aria-hidden="true" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye size={15} aria-hidden="true" />
                    Mostrar
                  </>
                )}
              </button>
              <span id="toggle-warning" className="sr-only">
                Advertencia: esto mostrará tu contraseña en la pantalla.
              </span>
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              id="current-password"
              name="password"
              autoComplete="current-password"
              enterKeyHint="done"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] bg-iujo-red px-5 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-iujo-dark focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0b57d0] disabled:cursor-not-allowed disabled:opacity-65"
          >
            <LogIn size={18} aria-hidden="true" />
            {isSubmitting ? 'Verificando acceso...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Secondary info placed underneath the Sign In button */}
        <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Lock size={14} className="text-iujo-red" aria-hidden="true" />
            Acceso restringido a personal autorizado
          </div>
          <p className="mt-1">
            Credenciales configurables mediante las variables de entorno{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">ADMIN_USER</code> y{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">ADMIN_PASSWORD</code> en{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">.env</code> o Vercel.
          </p>
        </div>
      </section>
    </main>
  );
}

