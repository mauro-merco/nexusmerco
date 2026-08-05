'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { Loader2, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';

const PHRASES = [
  'Diseño que convierte',
  'Marketing con propósito',
  'Datos que inspiran',
  'Estrategia que crece',
  'Creatividad con resultados',
];

function TypewriterText() {
  const [display, setDisplay] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    if (pause) {
      const t = setTimeout(() => setPause(false), 1500);
      return () => clearTimeout(t);
    }

    const current = PHRASES[phraseIndex];

    if (!isDeleting) {
      if (charIndex < current.length) {
        const t = setTimeout(() => setDisplay(current.slice(0, charIndex + 1)), 55);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPause(true), 2000);
        return () => clearTimeout(t);
      }
    } else {
      if (charIndex > 0) {
        const t = setTimeout(() => setDisplay(current.slice(0, charIndex - 1)), 30);
        return () => clearTimeout(t);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
      }
    }
  }, [charIndex, isDeleting, pause, phraseIndex]);

  useEffect(() => {
    setCharIndex(0);
    setIsDeleting(false);
    setDisplay('');
  }, [phraseIndex]);

  return (
    <span className="inline-block">
      {display}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA, isLoading, pending2FA } = useAuthStore();
  const _ = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    const result = await login(email, password);

    if (result.success && !result.needs2FA) {
      router.push('/dashboard');
    } else if (result.needs2FA) {
      // 2FA screen will show
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }
  }

  async function handle2FASubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Ingresá el código de 6 dígitos');
      return;
    }

    const result = await verify2FA(code);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Código inválido');
    }
  }

  if (pending2FA) {
    return (
      <div className="relative flex min-h-screen flex-col md:flex-row overflow-hidden">
        <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#0a0a1a] via-[#0f0a2e] to-[#1a0a2e] p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.12),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(168,85,247,0.12),transparent_50%)]" />
          <div className="relative z-10 text-center">
            <h1 className="text-5xl font-bold leading-tight">
              <TypewriterText />
            </h1>
            <p className="mt-6 text-lg text-muted-foreground/80 max-w-md mx-auto">
              Plataforma de marketing para equipos que marcan la diferencia
            </p>
            <div className="mt-10 flex items-center justify-center gap-6 text-xs text-muted-foreground/50">
              <span>Analytics</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>Automatización</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>Creatividad</span>
            </div>
          </div>
        </div>

        <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-6">
          <div className="mb-8">
            <img src="/merco-light-mode.svg" alt="Merco" className="h-8 mx-auto dark:hidden" />
            <img src="/merco-dark-mode.svg" alt="Merco" className="h-8 mx-auto hidden dark:block" />
          </div>

          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <ShieldCheck className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-xl">Verificación en dos pasos</CardTitle>
              <CardDescription>Ingresá el código de 6 dígitos de tu app de autenticación</CardDescription>
            </CardHeader>
            <form onSubmit={handle2FASubmit}>
              <CardContent className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="2fa-code" className="text-sm font-medium">Código Google Authenticator</Label>
                  <Input
                    id="2fa-code"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-14 rounded-xl text-center text-2xl tracking-[0.5em]"
                    maxLength={6}
                    disabled={isLoading}
                    autoFocus
                    required
                  />
                </div>

                <Button type="submit" variant="cta" size="cta" className="w-full" disabled={isLoading || code.length !== 6}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                  ) : (
                    'Verificar'
                  )}
                </Button>

                <button type="button" onClick={() => { setEmail(''); setPassword(''); setCode(''); useAuthStore.setState({ pending2FA: false, pendingUserId: null }); }} className="flex items-center gap-1 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
                </button>
              </CardContent>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col md:flex-row overflow-hidden">
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#0a0a1a] via-[#0f0a2e] to-[#1a0a2e] p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.12),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(168,85,247,0.12),transparent_50%)]" />
        <div className="relative z-10 text-center">
          <h1 className="text-5xl font-bold leading-tight">
            <TypewriterText />
          </h1>
          <p className="mt-6 text-lg text-muted-foreground/80 max-w-md mx-auto">
            Plataforma de marketing para equipos que marcan la diferencia
          </p>
          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-muted-foreground/50">
            <span>Analytics</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>Automatización</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>Creatividad</span>
          </div>
        </div>
      </div>

      <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-6">
        <div className="mb-8">
          <img src="/merco-light-mode.svg" alt="Merco" className="h-8 mx-auto dark:hidden" />
          <img src="/merco-dark-mode.svg" alt="Merco" className="h-8 mx-auto hidden dark:block" />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{_('login.welcome')}</CardTitle>
            <CardDescription>Ingresá tus credenciales para acceder</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-14 rounded-xl text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-14 rounded-xl text-base"
                  required
                />
              </div>

              <Button type="submit" variant="cta" size="cta" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando sesión...</>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}