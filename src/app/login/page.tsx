'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { Loader2, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';

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
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background to-muted p-4">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-tech opacity-25 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full opacity-25 blur-[80px]" style={{ backgroundImage: 'radial-gradient(circle, rgba(34,211,238,0.5), transparent 70%)' }} />
        <div className="mb-8">
          <img src="/merco-light-mode.svg" alt="Merco" className="h-6 mx-auto dark:hidden" />
          <img src="/merco-dark-mode.svg" alt="Merco" className="h-6 mx-auto hidden dark:block" />
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
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="2fa-code">Código Google Authenticator</Label>
                <Input
                  id="2fa-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-[0.5em]"
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

              <button type="button" onClick={() => { setEmail(''); setPassword(''); setCode(''); useAuthStore.setState({ pending2FA: false, pendingUserId: null }); }}
                className="flex items-center gap-1 mx-auto text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Volver al inicio de sesión
              </button>
            </CardContent>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="mb-8">
        <img src="/merco-light-mode.svg" alt="Merco" className="h-6 mx-auto dark:hidden" />
        <img src="/merco-dark-mode.svg" alt="Merco" className="h-6 mx-auto hidden dark:block" />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{_('login.welcome')}</CardTitle>
          <CardDescription>Ingresá tus credenciales para acceder</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
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
  );
}
