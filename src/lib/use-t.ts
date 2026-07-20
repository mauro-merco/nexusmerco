'use client';

import { useLangStore } from '@/store/lang-store';
import { t } from '@/i18n';

export function useT() {
  const lang = useLangStore((s) => s.lang);
  return (key: string) => t(lang, key);
}
