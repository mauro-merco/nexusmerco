import { es } from './es';
import { en } from './en';
import type { Lang } from './types';

const translations = { es, en };

function getNested(obj: Record<string, unknown>, path: string): string {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj) as string ?? path;
}

export function t(lang: Lang, key: string): string {
  const dict = translations[lang] as unknown as Record<string, unknown>;
  return getNested(dict, key);
}

export { type Lang } from './types';
