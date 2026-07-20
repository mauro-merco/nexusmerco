'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { ThemeToggle } from '@/components/theme-toggle';
import { LangToggle } from '@/components/lang-toggle';
import {
  LayoutDashboard,
  Wand2,
  KanbanSquare,
  Cable,
  BrainCircuit,
  BarChart3,
  LogOut,
  Menu,
  ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';
import type { NavItem, UserRole } from '@/lib/types';

const navItems: NavItem[] = [
  { label: 'dashboard', href: '/dashboard', icon: 'LayoutDashboard', roles: ['admin', 'team', 'client'] },
  { label: 'wizard', href: '/wizard', icon: 'Wand2', roles: ['admin', 'team'] },
  { label: 'operations', href: '/operations', icon: 'KanbanSquare', roles: ['admin', 'team'] },
  { label: 'analysis', href: '/analysis', icon: 'BarChart3', roles: ['admin', 'team', 'client'] },
  { label: 'integrations', href: '/integrations', icon: 'Cable', roles: ['admin', 'team'] },
  { label: 'insights', href: '/insights', icon: 'BrainCircuit', roles: ['admin', 'team', 'client'] },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Wand2,
  KanbanSquare,
  BarChart3,
  Cable,
  BrainCircuit,
};

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const _ = useT();

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className={cn('flex h-14 items-center gap-2 border-b px-4', collapsed && 'justify-center px-2')}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">N</span>
        </div>
        {!collapsed && (
          <span className="font-semibold tracking-tight">Nexus OS</span>
        )}
      </div>

      <ScrollArea className="flex-1 px-2">
        <nav className="flex flex-col gap-1 py-2">
          {visibleItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size={collapsed ? 'icon' : 'sm'}
                  className={cn(
                    'w-full justify-start gap-3',
                    isActive && 'bg-accent font-medium',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {!collapsed && <span>{_(`nav.${item.label}`)}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className={cn('border-t p-2 space-y-1', collapsed && 'flex flex-col items-center')}>
        {!collapsed && user && (
          <div className="px-2 text-xs text-muted-foreground">
            <div className="truncate font-medium text-foreground">{user.full_name}</div>
            <div className="capitalize">{user.role}</div>
          </div>
        )}
        <LangToggle collapsed={collapsed} />
        <ThemeToggle collapsed={collapsed} />
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className="w-full justify-start gap-3"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{_('nav.logout')}</span>}
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside
        className={cn(
          'hidden border-r bg-sidebar transition-all duration-200 md:flex md:flex-col',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="relative flex flex-1 flex-col">
          <SidebarContent collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-14 h-6 w-6 rounded-full border bg-background"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn('h-3 w-3 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>
      </aside>

      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden fixed top-3 left-3 z-50" />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    </>
  );
}
