'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { AIWidget } from '@/components/ai-widget';
import { GlobalSearch } from '@/components/global-search';
import { NotificationBell } from '@/components/notification-bell';
import { NotificationToasts } from '@/components/notification-toasts';
import { RemindersBell } from '@/components/reminders-bell';
import { ProfileMenu } from '@/components/profile-menu';
import { SuggestionsFloatingButtons } from '@/components/suggestions-floating-buttons';
import { useAuthStore } from '@/store/auth-store';
import { initAuthSync } from '@/lib/auth-sync';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    initAuthSync();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 bg-background flex items-center justify-between px-4 gap-2">
          <div className="flex-1 flex justify-center px-2">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <RemindersBell />
            <ProfileMenu />
          </div>
        </header>
        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background p-4 pb-20 md:pb-4">
          {children}
        </main>
      </div>
      <AIWidget />
      <NotificationToasts />
      <SuggestionsFloatingButtons />
    </div>
  );
}
