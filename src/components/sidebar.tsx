'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { DEFAULT_MODULES } from '@/lib/types';
import { hasModuleAccess } from '@/lib/permissions';
import { ThemeToggle } from '@/components/theme-toggle';
import { LangToggle } from '@/components/lang-toggle';
import {
  LayoutDashboard,
  KanbanSquare,
  DatabaseZap,
  Calendar,
  FileText,
  LogOut,
  Settings,
  LayoutGrid,
  Users2,
  Lightbulb,
  FileCode,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { NavItem } from '@/lib/types';

const navItems: NavItem[] = [
  { label: 'dashboard', href: '/dashboard', icon: 'LayoutDashboard', moduleId: 'dashboard', roles: ['admin', 'operador', 'client'] },
  { label: 'dataCenter', href: '/datos', icon: 'DatabaseZap', moduleId: 'datos', roles: ['admin', 'operador', 'client'] },
  { label: 'operations', href: '/operations', icon: 'KanbanSquare', moduleId: 'tareas', roles: ['admin', 'operador'] },
  { label: 'team', href: '/team', icon: 'Users2', moduleId: 'equipo', roles: ['admin', 'operador'] },
  { label: 'calendar', href: '/calendarios', icon: 'Calendar', moduleId: 'calendarios', roles: ['admin', 'operador', 'client'] },
  { label: 'documents', href: '/documentos', icon: 'FileText', moduleId: 'documentos', roles: ['admin', 'operador', 'client'] },
  { label: 'suggestions', href: '/sugerencias', icon: 'Lightbulb', moduleId: 'sugerencias', roles: ['admin', 'operador', 'client'] },
  { label: 'salas', href: '/salas', icon: 'MessagesSquare', moduleId: 'salas', roles: ['admin', 'operador', 'client'] },
  { label: 'development', href: '/desarrollo', icon: 'FileCode', moduleId: 'desarrollo', roles: ['admin', 'operador'] },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  KanbanSquare,
  DatabaseZap,
  Calendar,
  FileText,
  Settings,
  Users2,
  Lightbulb,
  FileCode,
  MessagesSquare,
};

const STORAGE_KEY = 'nexus-sidebar-collapsed';

// Visual grouping only: same items, same permissions, same navigation.
const NAV_GROUPS: { key: string; hrefs: string[] }[] = [
  { key: 'groupMain', hrefs: ['/dashboard', '/datos', '/calendarios'] },
  { key: 'groupOps', hrefs: ['/operations', '/team', '/salas'] },
  { key: 'groupResources', hrefs: ['/documentos', '/sugerencias', '/desarrollo'] },
];

function DesktopSidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle: () => void; onNavigate: (href: string, label: string) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const _ = useT();

  const visibleItems = navItems.filter(
    (item) => hasModuleAccess(user, item.moduleId)
  );

  const grouped = NAV_GROUPS.map((g) => ({
    key: g.key,
    items: visibleItems.filter((item) => g.hrefs.includes(item.href)),
  }));
  const ungrouped = visibleItems.filter((item) => !NAV_GROUPS.some((g) => g.hrefs.includes(item.href)));
  if (ungrouped.length) grouped[grouped.length - 1].items.push(...ungrouped);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const itemClass = (active: boolean) =>
    cn(
      'group w-full flex items-center gap-3 rounded-full px-3.5 h-10 text-[13px] font-medium transition-colors',
      collapsed && 'justify-center px-0',
      active
        ? 'bg-brand-gradient shadow-brand font-semibold'
        : 'text-sidebar-foreground/80 hover:bg-muted hover:text-foreground'
    );

  return (
    <div
      className={cn(
        'hidden md:flex flex-col shrink-0 h-screen bg-sidebar border-r border-sidebar-border transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-[240px]'
      )}
    >
      <div className={cn('flex items-center justify-between gap-2 h-16 shrink-0 px-5', collapsed && 'justify-center px-0')}>
        <button
          type="button"
          onClick={() => onNavigate('/dashboard', _('nav.dashboard'))}
          aria-label="Merco Nexus"
          className="flex shrink-0 items-center justify-center"
        >
          {collapsed ? (
            <img src="/merco-iso.svg" alt="Merco" className="h-[19px] w-auto" />
          ) : (
            <>
              <img src="/merco-light-mode.svg" alt="Merco Nexus" className="h-[17px] w-auto dark:hidden" />
              <img src="/merco-dark-mode.svg" alt="Merco Nexus" className="hidden h-[17px] w-auto dark:block" />
            </>
          )}
        </button>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Colapsar menú"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <PanelLeftClose className="h-[17px] w-[17px]" />
          </button>
        )}
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-2">
        {grouped.map((group, gi) =>
          group.items.length === 0 ? null : (
            <div key={group.key} className={cn(gi > 0 && 'mt-4')}>
              {collapsed ? (
                gi > 0 && <div className="mx-3 mb-3 h-px bg-sidebar-border" />
              ) : (
                <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                  {_(`nav.${group.key}`)}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = iconMap[item.icon];
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      type="button"
                      title={collapsed ? _(`nav.${item.label}`) : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onNavigate(item.href, _(`nav.${item.label}`))}
                      className={itemClass(active)}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{_(`nav.${item.label}`)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}
      </nav>

      <div className="px-3 pb-2 space-y-0.5">
        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expandir menú"
            className="w-full flex items-center justify-center rounded-full h-10 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <PanelLeftOpen className="h-[17px] w-[17px]" />
          </button>
        )}
        <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
          <button
            type="button"
            title={collapsed ? _('nav.settings') : undefined}
            onClick={() => onNavigate('/settings', _('nav.settings'))}
            className={cn(itemClass(isActive('/settings')), 'flex-1')}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{_('nav.settings')}</span>}
          </button>
          <LangToggle collapsed />
          <ThemeToggle collapsed />
        </div>
      </div>

      <div className={cn('flex items-center gap-2.5 border-t border-sidebar-border px-4 py-3', collapsed && 'flex-col px-2 gap-1.5')}>
        {user && (
          user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[12px] font-bold">
              {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
            </div>
          )
        )}
        {!collapsed && user && (
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold truncate">{user.full_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.role === 'admin' ? 'Admin' : user.role === 'operador' ? 'Operador' : 'Cliente'}</p>
          </div>
        )}
        <div className="flex items-center">
          <button
            type="button"
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label={_('nav.logout')}
            title={_('nav.logout')}
          >
            <LogOut className="h-4 w-4" />
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
    (item) => hasModuleAccess(user, item.moduleId)
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
  const [collapsed, setCollapsed] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === '1');
  }, []);

  const handleNavigate = (href: string) => {
    if (pathname === href) return;
    router.push(href);
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
    </>
  );
}
