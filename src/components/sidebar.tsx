'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  ChevronRight,
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

const STORAGE_KEY = 'nexus-sidebar-collapsed';

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
        <svg viewBox="0 0 80 80" className="h-24 w-24 animate-[transition-pop_0.5s_cubic-bezier(0.22,1,0.36,1)_both]">
          <defs>
            <linearGradient id="transition-loader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <circle cx="40" cy="40" r="34" fill="none" stroke="url(#transition-loader-grad)" strokeWidth="5" strokeLinecap="round" strokeDasharray="214" strokeDashoffset="214" style={{ animation: 'draw 1.4s ease-in-out infinite' }} />
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

function DesktopSidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle: () => void; onNavigate: (href: string, label: string) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const _ = useT();

  const visibleItems = navItems.filter(
    (item) => user && (user.visible_modules?.includes(item.moduleId) || DEFAULT_MODULES[user.role]?.includes(item.moduleId))
  );

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div
      className={cn(
        'hidden md:flex flex-col shrink-0 h-screen bg-card border-r border-border/60 transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[224px]'
      )}
    >
      <div className={cn('flex items-center gap-2.5 h-12 shrink-0 px-3', collapsed && 'justify-center px-0')}>
        <button
          type="button"
          onClick={() => onNavigate('/dashboard', _('nav.dashboard'))}
          className="bg-gradient-tech flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
        >
          M
        </button>
        {!collapsed && <span className="text-sm font-bold text-foreground truncate">Nexus</span>}
      </div>

      <div className="sidebar-scroll flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon];
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              type="button"
              title={collapsed ? _(`nav.${item.label}`) : undefined}
              onClick={() => onNavigate(item.href, _(`nav.${item.label}`))}
              className={cn(
                'group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors',
                collapsed && 'justify-center px-0 h-11',
                active ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{_(`nav.${item.label}`)}</span>}
            </button>
          );
        })}
      </div>

      <div className="px-2.5 pb-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className={cn('w-full flex items-center rounded-xl h-9 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors', collapsed ? 'justify-center' : 'justify-end px-2')}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className={cn('flex items-center gap-2 border-t border-border/60 px-2.5 py-2.5', collapsed && 'flex-col')}>
        {!collapsed && user && (
          <>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border border-border shrink-0" />
            ) : (
              <div className="bg-gradient-tech flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white">
                {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold truncate">{user.full_name}</p>
              <p className="text-[9.5px] text-muted-foreground truncate">{user.role === 'admin' ? 'Admin' : user.role === 'operador' ? 'Operador' : 'Cliente'}</p>
            </div>
          </>
        )}
        <div className={cn('flex items-center gap-1', collapsed && 'flex-col gap-1.5 mt-1')}>
          <LangToggle collapsed />
          <ThemeToggle collapsed />
          <button
            type="button"
            onClick={() => onNavigate('/settings', _('nav.settings'))}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            aria-label={_('nav.settings')}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            aria-label={_('nav.logout')}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileBottomNav({ onNavigate }: { onNavigate: (href: string, label: string) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const _ = useT();
  const [open, setOpen] = useState(false);

  const visibleItems = navItems.filter(
    (item) => user && (user.visible_modules?.includes(item.moduleId) || DEFAULT_MODULES[user.role]?.includes(item.moduleId))
  );

  const handleAppClick = (href: string, label: string) => {
    setOpen(false);
    onNavigate(href, label);
  };

  return (
    <>
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 h-14 border-t bg-background/80 backdrop-blur-xl">
        <button type="button" onClick={() => setOpen(true)} className="flex h-full w-full items-center gap-3 px-4 transition-all active:scale-[0.97]">
          <span className="bg-gradient-tech glow-tech flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <LayoutGrid className="h-4 w-4 text-white" />
          </span>
          <span className="text-gradient-tech text-sm font-semibold">Aplicaciones</span>
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-[80] flex flex-col" style={{ animation: 'transition-fade 0.2s ease-out' }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative mt-auto max-h-[80vh] overflow-y-auto rounded-t-3xl border-t bg-background/95 backdrop-blur-xl shadow-2xl" style={{ animation: 'transition-slide-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center gap-3 px-5 py-3 border-b">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="bg-gradient-tech flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  {(user?.full_name || user?.email || '?').charAt(0).toUpperCase()}
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
                  <button key={item.href} onClick={() => handleAppClick(item.href, _(`nav.${item.label}`))} className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95">
                    <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl transition-all', isActive ? 'bg-gradient-tech glow-tech text-white' : 'bg-muted/50 text-muted-foreground')}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={cn('text-[10px] font-medium leading-tight text-center line-clamp-2', isActive ? 'text-gradient-tech' : 'text-muted-foreground')}>{_(`nav.${item.label}`)}</span>
                  </button>
                );
              })}
              <button onClick={() => handleAppClick('/settings', _('nav.settings'))} className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95">
                <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl transition-all', pathname === '/settings' ? 'bg-gradient-tech glow-tech text-white' : 'bg-muted/50 text-muted-foreground')}>
                  <Settings className="h-5 w-5" />
                </span>
                <span className={cn('text-[10px] font-medium leading-tight text-center', pathname === '/settings' ? 'text-gradient-tech' : 'text-muted-foreground')}>{_('nav.settings')}</span>
              </button>
            </div>
            <div className="flex items-center justify-between border-t px-5 py-3 pb-5">
              <div className="flex items-center gap-2">
                <LangToggle collapsed />
                <ThemeToggle collapsed />
              </div>
              <button onClick={() => { setOpen(false); logout(); }} className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors active:scale-95">
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
  const [collapsed, setCollapsed] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === '1');
  }, []);

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

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, c ? '0' : '1');
      return !c;
    });
  };

  return (
    <>
      <DesktopSidebar collapsed={collapsed} onToggle={toggleCollapsed} onNavigate={handleNavigate} />
      <MobileBottomNav onNavigate={handleNavigate} />
      {transition && <TransitionOverlay label={transition.label} />}
    </>
  );
}
