'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MinimizedItemType = 'task' | 'idea';

export interface MinimizedItem {
  id: string;
  type: MinimizedItemType;
  title: string;
  subtitle?: string;
  clientId?: string | null;
  routeContext?: 'social' | 'ads' | 'operations' | 'calendarios' | null;
  ideaCalendarType?: 'social' | 'ads' | null;
  task?: any;
  idea?: any;
}

interface MinimizedStore {
  items: MinimizedItem[];
  minimize: (item: MinimizedItem) => void;
  restore: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useMinimizedStore = create<MinimizedStore>()(
  persist(
    (set, get) => ({
      items: [],
      minimize: (item) => {
        const items = get().items;
        if (items.find((i) => i.id === item.id)) return;
        set({ items: [...items, item] });
      },
      restore: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },
      remove: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },
      clear: () => set({ items: [] }),
    }),
    { name: 'nexus-minimized' }
  )
);
