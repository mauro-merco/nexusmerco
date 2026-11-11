'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, Eye, EyeOff, BarChart3, Sparkles, LayoutGrid, ShieldCheck, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

// Estilos compartidos de la vista (solo presentación)
const fieldWrap = 'relative flex items-center rounded-xl border bg-surface-inset transition-all duration-200';
const fieldOn = 'border-primary bg-card ring-4 ring-primary/15';
const fieldOff = 'border-border';
const fieldInput = 'h-12 border-0 bg-transparent px-4 text-[15px] text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent';
const submitClass = 'bg-brand-gradient shadow-brand h-12 w-full rounded-full border-0 text-[15px] font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-60';

const FEATURES = [
  { icon: BarChart3, title: 'Analytics en tiempo real', desc: 'Cada métrica que importa, en un solo lugar' },
  { icon: Sparkles, title: 'Automatización inteligente', desc: 'Campañas optimizadas sin esfuerzo extra' },
  { icon: LayoutGrid, title: 'Control total', desc: 'Clientes, tareas y calendarios juntos' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA, isLoading, pending2FA } = useAuthStore();
  const _ = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [code, setCode] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    const result = await login(email, password);
    if (result.needs2FA) return;
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (code.trim().length < 6) {
      setError('Ingresá el código de 6 dígitos de tu aplicación de autenticación');
      return;
    }
    const result = await verify2FA(code.trim());
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Código inválido');
    }
  }

  const errorBox = error && (
    <div role="alert" className="flex items-center gap-2.5 rounded-2xl bg-tint-red px-4 py-3 text-sm text-tint-red-foreground">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  );

  return (
    <div className="relative flex min-h-dvh bg-background lg:p-3">
      {/* HERO — solo en pantallas grandes */}
      <aside className="bg-brand-gradient relative hidden overflow-hidden rounded-[2rem] lg:flex lg:w-[46%] xl:w-5/12">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-80 blur-[6px]" style={{ background: 'radial-gradient(circle at 35% 35%, #D2E3FC 0%, #8AB4F8 40%, rgba(26,115,232,0) 72%)' }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%)' }} />

        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-12">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white">
              <img src="/merco-iso.svg" alt="" className="h-[18px]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/85">Nexus Merco</span>
          </div>

          <div>
            <h1 className="max-w-md text-[2.6rem] font-light leading-[1.08] tracking-tight xl:text-[3.1rem]">
              Marketing que transforma datos en resultados
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/80">
              El centro de control de la agencia: métricas, equipo y clientes en un mismo lugar.
            </p>
          </div>

          <div className="space-y-2.5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1A73E8]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-white/75">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* FORMULARIO */}
      <main className="relative flex w-full flex-1 flex-col items-center justify-center px-4 py-16 sm:px-8 lg:px-12">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[420px]">
          <div className="mb-10">
            <img src="/merco-light-mode.svg" alt="Merco Nexus" className="h-7 dark:hidden" />
            <img src="/merco-dark-mode.svg" alt="Merco Nexus" className="hidden h-7 dark:block" />
          </div>

          <div className="mb-8">
            <h2 className="text-[2.1rem] font-normal leading-tight tracking-tight sm:text-[2.4rem]">
              {pending2FA ? 'Verificá tu identidad' : 'Bienvenido de vuelta'}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {pending2FA ? 'Un paso más para entrar a tu cuenta' : 'Accede a tu cuenta para continuar'}
            </p>
          </div>

          {pending2FA ? (
            <form onSubmit={handleVerify} className="space-y-5">
              {errorBox}

              <div className="flex items-start gap-3 rounded-2xl bg-tint-blue p-4 text-tint-blue-foreground">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-[13px] leading-relaxed">
                  Tu cuenta tiene verificación en dos pasos activada. Ingresá el código de 6 dígitos
                  de tu aplicación de autenticación.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs font-medium text-muted-foreground">Código de verificación</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  className="h-14 rounded-xl border-border bg-surface-inset text-center text-2xl font-semibold tracking-[0.4em] shadow-none focus-visible:bg-card"
                />
              </div>

              <Button type="submit" disabled={isLoading} className={submitClass}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando...</>
                ) : (
                  'Verificar código'
                )}
              </Button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorBox}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <div className={cn(fieldWrap, focusedField === 'email' ? fieldOn : fieldOff)}>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isLoading}
                  className={fieldInput}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Contraseña</Label>
              <div className={cn(fieldWrap, focusedField === 'password' ? fieldOn : fieldOff)}>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isLoading}
                  className={cn(fieldInput, 'pr-12')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="group flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-border accent-[#1A73E8]" />
                <span className="text-muted-foreground transition-colors group-hover:text-foreground">Recuérdame</span>
              </label>
              <a href="#" className="font-medium text-primary transition-opacity hover:opacity-80">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button type="submit" disabled={isLoading} className={cn(submitClass, 'group gap-2')}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Iniciando sesión...</>
              ) : (
                <>Iniciar sesión <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
              )}
            </Button>
          </form>
          )}

          {!pending2FA && (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              ¿No tienes cuenta? <span className="cursor-pointer font-medium text-primary hover:opacity-80">Crea una</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
