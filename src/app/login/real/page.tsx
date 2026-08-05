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
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#0a0a1a] via-[#0f0a2e] to-[#1a0a2e] p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.12),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(168,85,247,0.12),transparent_50%)]" />
        <div className="relative z-10 text-center">
          <h1 className="text-5xl font-bold leading-tight text-gradient-tech">Nexus Merco</h1>
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