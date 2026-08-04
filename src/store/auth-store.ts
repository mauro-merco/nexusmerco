'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string;
  isLoading: boolean;
  hydrated: boolean;
  pending2FA: boolean;
  pendingUserId: string | null;
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

          const accessToken = authData.session?.access_token || '';

          try {
            const res = await fetch(`/api/auth/profile?userId=${authData.user.id}`);
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
                  client_id: json.data.client_id || null,
                  totp_enabled: json.data.totp_enabled || false,
                };
                set({ user, token: accessToken, isLoading: false });
                return { success: true };
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
            visible_modules: [],
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
        const { pendingUserId } = get();
        if (!pendingUserId) return { success: false, error: 'No hay sesión pendiente' };
        set({ isLoading: true });
        try {
          const res = await fetch('/api/auth/2fa/challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: pendingUserId, code }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Código inválido');
          // Fetch full profile and set user
          const profileRes = await fetch(`/api/auth/profile?userId=${pendingUserId}`);
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
                client_id: profileJson.data.client_id || null,
                totp_enabled: true,
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
        try {
          const { getSupabase } = await import('@/lib/supabase');
          await getSupabase().auth.signOut();
        } catch {
          // ignore
        }
        set({ user: null });
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
              const res = await fetch(`/api/auth/profile?userId=${au.id}`);
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
                      client_id: json.data.client_id || null,
                      totp_enabled: json.data.totp_enabled || false,
                    },
                    token: accessToken,
                    isLoading: false,
                  });
                  return;
                }
              }
            } catch {
              // fall through
            }
            set({
              user: {
                id: au.id,
                email: au.email || '',
                full_name: (au.user_metadata?.full_name as string) || au.email || '',
                avatar_url: (au.user_metadata?.avatar_url as string) || '',
                role: (au.user_metadata?.role as UserRole) || 'client',
                visible_modules: [],
                client_id: (au.user_metadata?.client_id as string) || null,
                totp_enabled: false,
              },
              token: accessToken,
              isLoading: false,
            });
          } else {
            // No session — try to use persisted user as fallback
            const current = get().user;
            if (current) {
              set({ isLoading: false });
            } else {
              set({ user: null, isLoading: false });
            }
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
