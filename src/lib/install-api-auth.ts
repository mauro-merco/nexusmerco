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

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const token = useAuthStore.getState().token;
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    if (input instanceof Request) return originalFetch(new Request(input, { ...init, headers }));
    return originalFetch(input, { ...init, headers });
  };
}
