'use client';

import { useRouter } from 'next/navigation';
import { PageSkeleton } from '@/components/content-skeleton';
import Link from 'next/link';
import { useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { AIWidget } from '@/components/ai-widget';
import { GlobalSearch } from '@/components/global-search';
import { NotificationBell } from '@/components/notification-bell';
import { MessagesBell } from '@/components/messages-bell';
import { NotificationToasts } from '@/components/notification-toasts';
import { RemindersBell } from '@/components/reminders-bell';
import { ProfileMenu } from '@/components/profile-menu';
import { SuggestionsFloatingButtons } from '@/components/suggestions-floating-buttons';
import { MinimizedDock } from '@/components/minimized-dock';
import { useAuthStore } from '@/store/auth-store';
import { initAuthSync } from '@/lib/auth-sync';
import { BookOpenText } from 'lucide-react';

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
      <div className="min-h-screen bg-background pt-14">
        <PageSkeleton />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="min-h-16 shrink-0 bg-background flex flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-8">
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <GlobalSearch />
            <SuggestionsFloatingButtons />
            {(user.role === 'admin' || user.role === 'operador') && (
              <Link href="/blog" aria-label="Blog de Merco" className="flex h-10 shrink-0 items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/5 px-2.5 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 dark:text-violet-300 sm:px-3">
                <BookOpenText className="h-4 w-4" />
                <span className="hidden lg:inline">Blog de Merco</span>
              </Link>
            )}
            <MessagesBell />
            <NotificationBell />
            <RemindersBell />
            <ProfileMenu />
          </div>
        </header>
        {/* Main content */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-background px-4 pt-2 pb-20 md:px-8 md:pb-8">
          {children}
        </main>
      </div>
      <AIWidget />
      <NotificationToasts />
      <MinimizedDock />
    </div>
  );
}
