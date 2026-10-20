'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/lib/types';
import { DEFAULT_MODULES } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string;
  isLoading: boolean;
  hydrated: boolean;
  pending2FA: boolean;
  pendingUserId: string | null;
  manualLogout: boolean;
  setToken: (token: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; needs2FA?: boolean }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: '',
      isLoading: true,
      hydrated: false,
      pending2FA: false,
      pendingUserId: null,
      manualLogout: false,

      setToken: (token: string) => set({ token }),

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          const { getSupabase } = await import('@/lib/supabase');
          const supabase = getSupabase();
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            set({ isLoading: false });
            return { success: false, error: authError.message };
          }

          if (!authData.user) {
            set({ isLoading: false });
            return { success: false, error: 'No se pudo autenticar el usuario' };
          }

          const userEmail = authData.user.email?.toLowerCase() || '';
          if (!userEmail.endsWith('@mercodigital.com') && !userEmail.endsWith('@mercouser.com')) {
            const { getSupabase } = await import('@/lib/supabase');
            await getSupabase().auth.signOut();
            set({ isLoading: false });
            return { success: false, error: 'Acceso denegado. Solo usuarios autorizados de Merco pueden iniciar sesión.' };
          }

          const accessToken = authData.session?.access_token || '';

          try {
            const res = await fetch(`/api/auth/profile?userId=${authData.user.id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
              const json = await res.json();
              if (json.data) {
                if (json.data.totp_enabled) {
                  // 2FA required — sign out from session, prompt for code
                  await supabase.auth.signOut();
                  set({ pending2FA: true, pendingUserId: authData.user.id, token: accessToken, isLoading: false });
                  return { success: true, needs2FA: true };
                }
                const user: User = {
                  id: json.data.id,
                  email: json.data.email,
                  full_name: json.data.full_name || json.data.email,
                  avatar_url: json.data.avatar_url || '',
                  role: json.data.role as UserRole,
                  visible_modules: json.data.visible_modules || [],
                  allowed_client_ids: json.data.allowed_client_ids || null,
                  client_id: json.data.client_id || null,
                  totp_enabled: json.data.totp_enabled || false,
                  bio: json.data.bio || '',
                  headline: json.data.headline || '',
                  is_public: json.data.is_public !== false,
                };
                set({ user, token: accessToken, isLoading: false });
                return { success: true };
              }
            } else if (res.status === 401) {
              // The proxy blocks profile reads until the 2FA challenge is solved.
              const json = await res.json().catch(() => ({}));
              if (/dos pasos/i.test(json?.error || '')) {
                set({ pending2FA: true, pendingUserId: authData.user.id, token: accessToken, isLoading: false });
                return { success: true, needs2FA: true };
              }
            }
          } catch {
            // fall through
          }

        const role = (authData.user.user_metadata?.role as string) || 'client';
        const fullName = (authData.user.user_metadata?.full_name as string) || authData.user.email || '';
          const user: User = {
            id: authData.user.id,
            email: authData.user.email || '',
            full_name: fullName,
            avatar_url: (authData.user.user_metadata?.avatar_url as string) || '',
            role: role as UserRole,
            visible_modules: DEFAULT_MODULES[role as UserRole] || [],
            client_id: (authData.user.user_metadata?.client_id as string) || null,
            totp_enabled: false,
          };
        set({ user, token: accessToken, isLoading: false });
          return { success: true };
        } catch {
          set({ isLoading: false });
          return { success: false, error: 'Error al conectar con el servidor' };
        }
      },

      verify2FA: async (code: string) => {
        const { pendingUserId, token } = get();
        if (!pendingUserId) return { success: false, error: 'No hay sesión pendiente' };
        set({ isLoading: true });
        try {
          const res = await fetch('/api/auth/2fa/challenge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ userId: pendingUserId, code }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Código inválido');
          // Fetch full profile and set user
          const profileRes = await fetch(`/api/auth/profile?userId=${pendingUserId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (profileRes.ok) {
            const profileJson = await profileRes.json();
            if (profileJson.data) {
              const user: User = {
                id: profileJson.data.id,
                email: profileJson.data.email,
                full_name: profileJson.data.full_name || profileJson.data.email,
                avatar_url: profileJson.data.avatar_url || '',
                role: profileJson.data.role as UserRole,
                visible_modules: profileJson.data.visible_modules || [],
                allowed_client_ids: profileJson.data.allowed_client_ids || null,
                client_id: profileJson.data.client_id || null,
                totp_enabled: true,
                bio: profileJson.data.bio || '',
                headline: profileJson.data.headline || '',
                is_public: profileJson.data.is_public !== false,
              };
              set({ user, pending2FA: false, pendingUserId: null, isLoading: false });
              return { success: true };
            }
          }
          set({ isLoading: false });
          return { success: false, error: 'Error al cargar perfil' };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err instanceof Error ? err.message : 'Error' };
        }
      },

      logout: async () => {
        set({ manualLogout: true });
        try {
          const { getSupabase } = await import('@/lib/supabase');
          await getSupabase().auth.signOut();
        } catch {
          // ignore
        }
        set({ user: null, token: '', manualLogout: false });
      },

      restoreSession: async () => {
        try {
          const { getSupabase } = await import('@/lib/supabase');
          const supabase = getSupabase();
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            const au = data.session.user;
            const accessToken = data.session.access_token || '';
            try {
              const res = await fetch(`/api/auth/profile?userId=${au.id}`, {
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
              });
              if (res.ok) {
                const json = await res.json();
                if (json.data) {
                  set({
                    user: {
                      id: json.data.id,
                      email: json.data.email,
                      full_name: json.data.full_name || json.data.email,
                      avatar_url: json.data.avatar_url || '',
                      role: json.data.role as UserRole,
                      visible_modules: json.data.visible_modules || [],
                      allowed_client_ids: json.data.allowed_client_ids || null,
                      client_id: json.data.client_id || null,
                      totp_enabled: json.data.totp_enabled || false,
                      bio: json.data.bio || '',
                      headline: json.data.headline || '',
                      is_public: json.data.is_public !== false,
                    },
                    token: accessToken,
                    isLoading: false,
                  });
                  return;
                }
              } else if (res.status === 401) {
                // Token invalid or the 12h 2FA proof expired: force a fresh
                // login instead of keeping a session that can't call any API.
                await supabase.auth.signOut().catch(() => {});
                set({ user: null, token: '', isLoading: false });
                return;
              }
            } catch {
              // fall through
            }
            const current = get().user;
            if (current && current.id === au.id) {
              // Profile fetch failed (network/transient error): keep the persisted
              // user intact instead of wiping its modules and role.
              set({ token: accessToken, isLoading: false });
              return;
            }
            const role = (au.user_metadata?.role as UserRole) || 'client';
            set({
              user: {
                id: au.id,
                email: au.email || '',
                full_name: (au.user_metadata?.full_name as string) || au.email || '',
                avatar_url: (au.user_metadata?.avatar_url as string) || '',
                role,
                visible_modules: DEFAULT_MODULES[role] || [],
                client_id: (au.user_metadata?.client_id as string) || null,
                totp_enabled: false,
              },
              token: accessToken,
              isLoading: false,
            });
          } else {
            // No session — if the persisted JWT is still valid, keep working
            // (transient refresh failures shouldn't log the user out instantly).
            const current = get().user;
            const prevToken = get().token;
            if (current && prevToken) {
              const { tokenUnexpired } = await import('@/lib/jwt');
              if (tokenUnexpired(prevToken)) {
                set({ isLoading: false });
                return;
              }
            }
            set({ user: null, token: '', isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'nexus-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.hydrated = true;
            state.pending2FA = false;
            state.pendingUserId = null;
            state.restoreSession();
          }
        };
      },
    }
  )
);
