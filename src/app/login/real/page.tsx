'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export default function RealLoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const _ = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col md:flex-row overflow-hidden">
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e] p-8 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(6,182,212,0.12),transparent_55%)] dark:bg-[radial-gradient(circle_at_20%_30%,rgba(34,211,238,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(168,85,247,0.12),transparent_55%)] dark:bg-[radial-gradient(circle_at_80%_70%,rgba(168,85,247,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-cyan-400/20 blur-[120px] dark:bg-cyan-400/30" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-violet-500/20 blur-[120px] dark:bg-violet-500/30" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)]" />

        <div className="relative z-10 text-center">
          <h1 className="text-5xl font-bold leading-tight text-gradient-tech">Nexus Merco</h1>
          <p className="mt-6 text-lg text-muted-foreground/80 dark:text-muted-foreground/70 max-w-md mx-auto">
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

      <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#ffffff] via-[#f8fafc] to-[#faf5ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e] p-6">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mb-8">
          <img src="/merco-light-mode.svg" alt="Merco" className="h-8 mx-auto dark:hidden" />
          <img src="/merco-dark-mode.svg" alt="Merco" className="h-8 mx-auto hidden dark:block" />
        </div>

        <Card className="w-full max-w-md border-border/50 dark:border-border/80">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
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
          <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
            <p>
              ¿Modo desarrollo?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Usar login de prueba
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}