'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/lib/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      hydrated: false,

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

          try {
            const res = await fetch(`/api/auth/profile?userId=${authData.user.id}`);
            if (res.ok) {
              const json = await res.json();
              if (json.data) {
                const user: User = {
                  id: json.data.id,
                  email: json.data.email,
                  full_name: json.data.full_name || json.data.email,
                  avatar_url: json.data.avatar_url || '',
                  role: json.data.role as UserRole,
                };
                set({ user, isLoading: false });
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
          };
          set({ user, isLoading: false });
          return { success: true };
        } catch {
          set({ isLoading: false });
          return { success: false, error: 'Error al conectar con el servidor' };
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
                    },
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
              },
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
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.hydrated = true;
            state.restoreSession();
          }
        };
      },
    }
  )
);
