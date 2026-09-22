'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { DEFAULT_MODULES } from '@/lib/types';
import { ThemeToggle } from '@/components/theme-toggle';
import { LangToggle } from '@/components/lang-toggle';
import {
  LayoutDashboard,
  Wand2,
  KanbanSquare,
  Cable,
  BrainCircuit,
  BarChart3,
  Calendar,
  FileText,
  LogOut,
  Settings,
  LayoutGrid,
  Mail,
  Users2,
  Lightbulb,
  ChevronLeft,
} from 'lucide-react';
import type { NavItem } from '@/lib/types';

const navItems: NavItem[] = [
  { label: 'dashboard', href: '/dashboard', icon: 'LayoutDashboard', moduleId: 'dashboard', roles: ['admin', 'operador', 'client'] },
  { label: 'wizard', href: '/wizard', icon: 'Wand2', moduleId: 'wizard', roles: ['admin', 'operador'] },
  { label: 'operations', href: '/operations', icon: 'KanbanSquare', moduleId: 'tareas', roles: ['admin', 'operador'] },
  { label: 'team', href: '/team', icon: 'Users2', moduleId: 'equipo', roles: ['admin', 'operador'] },
  { label: 'analysis', href: '/analysis', icon: 'BarChart3', moduleId: 'analysis', roles: ['admin', 'operador', 'client'] },
  { label: 'integrations', href: '/integrations', icon: 'Cable', moduleId: 'integrations', roles: ['admin', 'operador'] },
  { label: 'insights', href: '/insights', icon: 'BrainCircuit', moduleId: 'insights', roles: ['admin', 'operador', 'client'] },
  { label: 'calendar', href: '/calendarios', icon: 'Calendar', moduleId: 'calendarios', roles: ['admin', 'operador', 'client'] },
  { label: 'documents', href: '/documentos', icon: 'FileText', moduleId: 'documentos', roles: ['admin', 'operador', 'client'] },
  { label: 'messages', href: '/messages', icon: 'Mail', moduleId: 'mensajes', roles: ['admin', 'operador', 'client'] },
  { label: 'suggestions', href: '/sugerencias', icon: 'Lightbulb', moduleId: 'sugerencias', roles: ['admin', 'operador', 'client'] },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Wand2,
  KanbanSquare,
  BarChart3,
  Cable,
  BrainCircuit,
  Calendar,
  FileText,
  Settings,
  Mail,
  Users2,
  Lightbulb,
};

function TransitionOverlay({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-background/85 backdrop-blur-md animate-[transition-fade_0.4s_ease-out_both]"
    >
      <div className="bg-gradient-tech pointer-events-none absolute left-1/4 top-1/4 h-72 w-72 animate-pulse rounded-full opacity-30 blur-[90px]" />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-72 w-72 animate-pulse rounded-full opacity-30 blur-[90px]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(34,211,238,0.5), transparent 70%)' }}
      />

      <div className="relative flex h-36 w-36 items-center justify-center">
        <div className="absolute inset-0 animate-[transition-ring_1s_ease-out_both] rounded-full border border-cyan-400/50" />
        <div className="absolute inset-0 animate-[transition-ring_1s_ease-out_0.35s_both] rounded-full border border-violet-500/50" />
        <div className="absolute inset-0 animate-[transition-ring_1s_ease-out_0.7s_both] rounded-full border border-fuchsia-500/50" />

        <svg
          viewBox="0 0 80 80"
          className="h-24 w-24 animate-[transition-pop_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
        >
          <defs>
            <linearGradient id="transition-loader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="url(#transition-loader-grad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="214"
            strokeDashoffset="214"
            style={{ animation: 'draw 1.4s ease-in-out infinite' }}
          />
        </svg>

        <div className="bg-gradient-tech pointer-events-none absolute h-10 w-10 animate-pulse rounded-full opacity-30 blur-2xl" />
      </div>

      <div className="space-y-1 text-center">
        <p className="text-xs text-muted-foreground">Cargando</p>
        <p className="text-gradient-tech text-2xl font-bold">{label}</p>
      </div>
    </div>
  );
}

function AppsDock({ onNavigate }: { onNavigate: (href: string, label: string) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const _ = useT();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const visibleItems = navItems.filter(
    (item) =>
      user &&
      (user.visible_modules?.includes(item.moduleId) ||
        DEFAULT_MODULES[user.role]?.includes(item.moduleId))
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleOpen = (href: string, label: string) => {
    setOpen(false);
    onNavigate(href, label);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Launcher button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Aplicaciones"
        className="fixed bottom-6 left-6 z-50 hidden md:flex flex-col items-center gap-1.5 group transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <span
          className={cn(
            'bg-gradient-tech glow-tech relative flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-all duration-500 group-hover:-rotate-6 group-hover:scale-110',
            open && 'rotate-[20deg] scale-105'
          )}
        >
          <span className="bg-gradient-tech pointer-events-none absolute -inset-1 rounded-2xl opacity-40 blur-lg transition-opacity duration-300 group-hover:opacity-70" />
          <LayoutGrid className="relative h-6 w-6 transition-transform duration-500 group-hover:rotate-180" />
        </span>
        <span className={cn('text-[10px] font-semibold transition-colors', open ? 'text-gradient-tech' : 'text-muted-foreground group-hover:text-foreground')}>
          {_('nav.apps')}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-[transition-fade_0.2s_ease-out]"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            className="absolute bottom-24 left-6 flex max-h-[72vh] w-[21rem] flex-col overflow-hidden rounded-3xl border border-primary/25 bg-popover shadow-2xl ring-1 ring-black/10 dark:ring-white/10 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.55)] backdrop-blur-2xl animate-[apps-pop_0.35s_cubic-bezier(0.22,1,0.36,1)_both] origin-bottom-left"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-5 py-4">
              <div className="bg-gradient-tech glow-tech flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                <span className="text-sm font-bold text-white">M</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gradient-tech truncate">Nexus Marketing</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.role === 'admin' ? 'Admin' : user?.role === 'operador' ? 'Operador' : 'Cliente'}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="sidebar-scroll flex-1 overflow-y-auto px-3 py-3">
              <div className="grid grid-cols-4 gap-1.5">
                {visibleItems.map((item, i) => {
                  const Icon = iconMap[item.icon];
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => handleOpen(item.href, _(`nav.${item.label}`))}
                      style={{ animationDelay: `${0.03 * i}s`, animationDuration: '0.35s', animationFillMode: 'both' }}
                      className="group flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all active:scale-95 animate-[apps-item_cubic-bezier(0.22,1,0.36,1)]"
                    >
                      <span
                        className={cn(
                          'relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300',
                          active
                            ? 'bg-gradient-tech glow-tech scale-105 text-white'
                            : 'bg-muted/50 text-muted-foreground group-hover:scale-110 group-hover:-rotate-6 group-hover:text-primary group-hover:shadow-[0_0_18px_rgba(34,211,238,0.3)]'
                        )}
                      >
                        <span className={cn('bg-gradient-tech pointer-events-none absolute -inset-1 rounded-2xl opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-40', active && 'opacity-40')} />
                        <Icon className="relative h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-medium leading-tight text-center line-clamp-2',
                          active ? 'text-gradient-tech font-bold' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      >
                        {_(`nav.${item.label}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-3 py-2.5 flex items-center justify-between gap-2">
              {user && (
                <div className="flex items-center gap-2 min-w-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="bg-gradient-tech flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-[2px]">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-background text-[10px] font-bold text-foreground">
                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <span className="text-[11px] font-semibold truncate max-w-[7rem]">{user.full_name || user.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <LangToggle collapsed />
                <ThemeToggle collapsed />
                <button
                  type="button"
                  onClick={() => handleOpen('/settings', _('nav.settings'))}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors active:scale-95"
                  aria-label={_('nav.settings')}
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors active:scale-95"
                  aria-label={_('nav.logout')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileBottomNav({ onNavigate }: { onNavigate: (href: string, label: string) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const _ = useT();
  const [open, setOpen] = useState(false);

  const visibleItems = navItems.filter(
    (item) =>
      user &&
      (user.visible_modules?.includes(item.moduleId) ||
        DEFAULT_MODULES[user.role]?.includes(item.moduleId))
  );

  const handleAppClick = (href: string, label: string) => {
    setOpen(false);
    onNavigate(href, label);
  };

  return (
    <>
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 h-14 border-t bg-background/80 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-full w-full items-center gap-3 px-4 transition-all active:scale-[0.97]"
        >
          <span className="bg-gradient-tech glow-tech flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <LayoutGrid className="h-4 w-4 text-white" />
          </span>
          <span className="text-gradient-tech text-sm font-semibold">Aplicaciones</span>
        </button>
      </div>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-[80] flex flex-col"
          style={{ animation: 'transition-fade 0.2s ease-out' }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative mt-auto max-h-[80vh] overflow-y-auto rounded-t-3xl border-t bg-background/95 backdrop-blur-xl shadow-2xl"
            style={{ animation: 'transition-slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center gap-3 px-5 py-3 border-b">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="bg-gradient-tech flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-[2px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-background text-sm font-bold text-foreground">
                    {(user?.full_name || user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 p-4">
              {visibleItems.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <button
                    key={item.href}
                    onClick={() => handleAppClick(item.href, _(`nav.${item.label}`))}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95"
                  >
                    <span
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-2xl transition-all',
                        isActive ? 'bg-gradient-tech glow-tech text-white' : 'bg-muted/50 text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium leading-tight text-center line-clamp-2',
                        isActive ? 'text-gradient-tech' : 'text-muted-foreground'
                      )}
                    >
                      {_(`nav.${item.label}`)}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => handleAppClick('/settings', _('nav.settings'))}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95"
              >
                <span
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl transition-all',
                    pathname === '/settings' ? 'bg-gradient-tech glow-tech text-white' : 'bg-muted/50 text-muted-foreground'
                  )}
                >
                  <Settings className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium leading-tight text-center',
                    pathname === '/settings' ? 'text-gradient-tech' : 'text-muted-foreground'
                  )}
                >
                  {_('nav.settings')}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between border-t px-5 py-3 pb-5">
              <div className="flex items-center gap-2">
                <LangToggle collapsed />
                <ThemeToggle collapsed />
              </div>
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors active:scale-95"
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Sidebar() {
  const [transition, setTransition] = useState<{ href: string; label: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!transition) return;
    const t = setTimeout(() => router.push(transition.href), 700);
    return () => clearTimeout(t);
  }, [transition, router]);

  useEffect(() => {
    setTransition(null);
  }, [pathname]);

  const handleNavigate = (href: string, label: string) => {
    if (pathname === href) return;
    setTransition({ href, label });
  };

  return (
    <>
      <AppsDock onNavigate={handleNavigate} />
      <MobileBottomNav onNavigate={handleNavigate} />

      {transition && <TransitionOverlay label={transition.label} />}
    </>
  );
}