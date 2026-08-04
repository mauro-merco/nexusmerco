'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
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
  ChevronDown,
  ChevronUp,
  LayoutGrid,
} from 'lucide-react';
import type { NavItem } from '@/lib/types';

const navItems: NavItem[] = [
  { label: 'dashboard', href: '/dashboard', icon: 'LayoutDashboard', moduleId: 'dashboard', roles: ['admin', 'operador', 'client'] },
  { label: 'wizard', href: '/wizard', icon: 'Wand2', moduleId: 'wizard', roles: ['admin', 'operador'] },
  { label: 'operations', href: '/operations', icon: 'KanbanSquare', moduleId: 'tareas', roles: ['admin', 'operador'] },
  { label: 'analysis', href: '/analysis', icon: 'BarChart3', moduleId: 'analysis', roles: ['admin', 'operador', 'client'] },
  { label: 'integrations', href: '/integrations', icon: 'Cable', moduleId: 'integrations', roles: ['admin', 'operador'] },
  { label: 'insights', href: '/insights', icon: 'BrainCircuit', moduleId: 'insights', roles: ['admin', 'operador', 'client'] },
  { label: 'calendar', href: '/calendarios', icon: 'Calendar', moduleId: 'calendarios', roles: ['admin', 'operador', 'client'] },
  { label: 'documents', href: '/documentos', icon: 'FileText', moduleId: 'documentos', roles: ['admin', 'operador', 'client'] },
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
};

function RailItem({
  Icon,
  label,
  href,
  isActive,
  onNavigate,
  onAction,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  isActive?: boolean;
  onNavigate?: (href: string, label: string) => void;
  onAction?: () => void;
}) {
  const inner = (
    <span
      data-active={isActive ? 'true' : undefined}
      className={cn(
        'group relative flex w-full flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-all duration-300',
        isActive ? 'bg-gradient-tech-soft' : 'hover:bg-white/[0.03]'
      )}
    >
      {isActive && (
        <span className="bg-gradient-tech absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full" />
      )}

      <span
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300',
          isActive
            ? 'bg-gradient-tech glow-tech scale-105 text-white'
            : 'bg-muted/40 text-muted-foreground group-hover:scale-110 group-hover:-rotate-6 group-hover:text-primary group-hover:shadow-[0_0_18px_rgba(34,211,238,0.3)]'
        )}
      >
        <span className="bg-gradient-tech pointer-events-none absolute -inset-1 rounded-xl opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-40" />
        <Icon className="relative h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
      </span>

      <span
        className={cn(
          'line-clamp-2 w-full text-center text-[10px] font-medium leading-tight transition-colors duration-300',
          isActive ? 'text-gradient-tech font-bold' : 'text-muted-foreground group-hover:text-foreground'
        )}
      >
        {label}
      </span>
    </span>
  );

  if (href && onNavigate) {
    return (
      <Link
        href={href}
        onClick={(e) => {
          e.preventDefault();
          onNavigate(href, label);
        }}
        className="block w-full"
      >
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onAction} className="w-full cursor-pointer">
      {inner}
    </button>
  );
}

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

function SidebarContent({ onNavigate }: { onNavigate: (href: string, label: string) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const _ = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanUp(el.scrollTop > 4);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  useEffect(() => {
    updateScroll();
    window.addEventListener('resize', updateScroll);
    return () => window.removeEventListener('resize', updateScroll);
  }, [updateScroll]);

  // Keep the active item visible inside the rail
  useEffect(() => {
    const el = scrollRef.current;
    const active = el?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [pathname]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: dir * (el.clientHeight - 48), behavior: 'smooth' });
  };

  const visibleItems = navItems.filter(
    (item) =>
      user &&
      (user.visible_modules?.includes(item.moduleId) ||
        DEFAULT_MODULES[user.role]?.includes(item.moduleId))
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 shrink-0 items-center justify-center border-b">
        <div className="bg-gradient-tech glow-tech flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 hover:rotate-6 hover:scale-110">
          <span className="text-sm font-bold text-primary-foreground">M</span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-1.5">
        <div
          ref={scrollRef}
          onScroll={updateScroll}
          className="no-scrollbar h-full overflow-y-auto"
        >
          <nav className="flex flex-col gap-0.5 py-2">
            {visibleItems.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <RailItem
                  key={item.href}
                  Icon={Icon}
                  label={_(`nav.${item.label}`)}
                  href={item.href}
                  isActive={isActive}
                  onNavigate={onNavigate}
                />
              );
            })}
          </nav>
        </div>

        {canDown && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-sidebar via-sidebar/80 to-transparent" />
        )}

        {(canDown || (canUp && !canDown)) && (
          <button
            type="button"
            onClick={() => scrollBy(canDown ? 1 : -1)}
            aria-label={canDown ? 'Bajar' : 'Subir'}
            className="bg-gradient-tech glow-tech absolute bottom-1 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 animate-[transition-fade_0.3s_ease-out]"
          >
            {canDown ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 border-t p-2">
        {user && (
          <div className="bg-gradient-tech mb-1 flex h-10 w-10 rounded-full p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background text-sm font-bold text-foreground">
              {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        <LangToggle collapsed />
        <ThemeToggle collapsed />
        <RailItem
          Icon={Settings}
          label={_('nav.settings')}
          href="/settings"
          isActive={pathname === '/settings'}
          onNavigate={onNavigate}
        />
        <RailItem Icon={LogOut} label={_('nav.logout')} onAction={logout} />
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
      <aside className="border-r bg-sidebar hidden w-28 md:flex md:flex-col">
        <div className="relative flex flex-1 flex-col">
          <SidebarContent onNavigate={handleNavigate} />
        </div>
      </aside>

      <MobileBottomNav onNavigate={handleNavigate} />

      {transition && <TransitionOverlay label={transition.label} />}
    </>
  );
}
