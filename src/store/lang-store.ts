'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from '@/i18n/types';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'es',
      setLang: (lang: Lang) => set({ lang }),
    }),
    {
      name: 'nexus-lang',
      partialize: (state) => ({ lang: state.lang }),
    }
  )
);
