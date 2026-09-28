'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const _ = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    <div className="relative flex min-h-screen overflow-hidden bg-black">
      {/* Animated background image side */}
      <div 
        className="hidden lg:flex lg:w-5/12 relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1200)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <h1 className="text-5xl font-bold leading-tight mb-4">
              Nexus
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">
                Merco
              </span>
            </h1>
            <p className="text-lg text-white/80 leading-relaxed max-w-md">
              La plataforma de marketing que transforma datos en resultados
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Analytics en Tiempo Real</p>
                <p className="text-white/60 text-sm">Monitorea cada métrica que importa</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Automatización Inteligente</p>
                <p className="text-white/60 text-sm">Optimiza campañas automáticamente</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Control Total</p>
                <p className="text-white/60 text-sm">Gestiona todo en un mismo lugar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login form side */}
      <div className="flex w-full lg:w-7/12 flex-col items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex justify-center lg:justify-start">
            <img src="/merco-light-mode.svg" alt="Merco" className="h-8 dark:hidden" />
            <img src="/merco-dark-mode.svg" alt="Merco" className="h-8 hidden dark:block" />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold">Bienvenido de vuelta</h2>
            <p className="text-muted-foreground">Accede a tu cuenta para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-600 dark:text-red-400 animate-in fade-in duration-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div 
                className={`relative rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                  focusedField === 'email' 
                    ? 'border-cyan-500 bg-white dark:bg-slate-900/50 shadow-lg shadow-cyan-500/20' 
                    : 'border-border bg-white/50 dark:bg-slate-900/30'
                }`}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isLoading}
                  className="h-14 border-0 bg-transparent px-5 text-base placeholder:text-muted-foreground/50 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <div 
                className={`relative rounded-xl border-2 transition-all duration-300 overflow-hidden flex items-center ${
                  focusedField === 'password' 
                    ? 'border-violet-500 bg-white dark:bg-slate-900/50 shadow-lg shadow-violet-500/20' 
                    : 'border-border bg-white/50 dark:bg-slate-900/30'
                }`}
              >
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isLoading}
                  className="h-14 border-0 bg-transparent px-5 text-base placeholder:text-muted-foreground/50 focus:outline-none pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="mr-4 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember me & forgot password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-border rounded-md" />
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">Recuérdame</span>
              </label>
              <a href="#" className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 transition-colors font-medium">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Submit button */}
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-14 rounded-xl text-base font-semibold bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Iniciando sesión...</>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta? <span className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 cursor-pointer font-medium">Crea una</span>
          </div>
        </div>
      </div>
    </div>
  );
}
