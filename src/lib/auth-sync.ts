'use client';

import { getSupabase } from '@/lib/supabase';
import { tokenUnexpired } from '@/lib/jwt';

let started = false;

// Keeps the auth store token in sync with supabase's auto-refreshed session,
// recovers from phantom sign-outs (refresh-token races, network blips, sleep),
// and only logs the user out when the JWT is actually gone.
export function initAuthSync() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const supabase = getSupabase();

  const syncToken = async () => {
    const { useAuthStore } = await import('@/store/auth-store');
    const st = useAuthStore.getState();
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      if (data.session.access_token !== st.token) {
        useAuthStore.setState({ token: data.session.access_token });
      }
      return;
    }
    // No supabase session. If the persisted JWT is still valid, keep the user in
    // (grace mode) until it expires instead of kicking to /login immediately.
    if (st.user && st.token && tokenUnexpired(st.token)) return;
    if (st.user) {
      useAuthStore.setState({ user: null, token: '' });
    }
  };

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      void (async () => {
        const { useAuthStore } = await import('@/store/auth-store');
        const st = useAuthStore.getState();
        if (st.manualLogout || !st.user) return;
        // Try to recover (another tab may have refreshed the token) before
        // treating it as a real logout.
        for (let i = 0; i < 6; i++) {
          if (i > 0) await new Promise((r) => setTimeout(r, 1500));
          const current = useAuthStore.getState();
          if (current.manualLogout || !current.user) return;
          const { data } = await supabase.auth.getSession();
          if (data?.session?.access_token) {
            useAuthStore.setState({ token: data.session.access_token });
            return;
          }
        }
        await syncToken();
      })();
      return;
    }
    if (session?.access_token) {
      void import('@/store/auth-store').then(({ useAuthStore }) => {
        const st = useAuthStore.getState();
        if (session.access_token !== st.token) {
          useAuthStore.setState({ token: session.access_token });
        }
      });
    }
  });

  // Periodic health check re-syncs the store token (background refresh timers
  // get throttled when the tab is asleep) and handles expiry cleanup.
  setInterval(() => {
    void syncToken();
  }, 60_000);

  // Waking the machine/browser is a common trigger for refresh failure.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncToken();
  });
}