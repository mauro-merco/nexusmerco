'use client';

import { useAuthStore } from '@/store/auth-store';

declare global {
  interface Window {
    __nexusAuthenticatedFetchInstalled?: boolean;
  }
}

export function installApiAuth() {
  if (typeof window === 'undefined' || window.__nexusAuthenticatedFetchInstalled) return;
  window.__nexusAuthenticatedFetchInstalled = true;
  const originalFetch = window.fetch.bind(window);
  let loggingOut = false;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const token = useAuthStore.getState().token;
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    const response = input instanceof Request
      ? await originalFetch(new Request(input, { ...init, headers }))
      : await originalFetch(input, { ...init, headers });

    // The proxy marks its own 401s. The 2FA proof cookie (12h) can expire
    // while the Supabase session is still valid; in that case every API
    // returns 401 and the app would look empty. Clear the local session so
    // the user is sent back to login and can solve the 2FA challenge again.
    if (
      response.status === 401
      && response.headers.get('x-nexus-auth') === 'required'
      && !url.pathname.startsWith('/api/auth/')
    ) {
      const state = useAuthStore.getState();
      if (state.user && !state.manualLogout && !loggingOut) {
        loggingOut = true;
        void Promise.resolve(state.logout()).finally(() => { loggingOut = false; });
      }
    }

    return response;
  };
}
