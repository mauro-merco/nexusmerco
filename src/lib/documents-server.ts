import { getAdminClient, getRequestUser, isStaff } from '@/lib/api-security';
import type { SupabaseClient } from '@supabase/supabase-js';

type Db = SupabaseClient<any, any, any, any, any>;

export interface DocCaller {
  id: string;
  role: string | null;
  client_id: string | null;
  allowed_client_ids: string[] | null;
  email: string | null;
  isStaff: boolean;
  isTeamDomain: boolean;
}

/** Usuario autenticado + email (para la regla de dominio @mercodigital.com). */
export async function getDocCaller(request: Request, db: Db = getAdminClient()): Promise<DocCaller | null> {
  const user = await getRequestUser(request, db);
  if (!user) return null;
  const { data: extra } = await db.from('users').select('email').eq('id', user.id).single();
  const email = (extra?.email as string | null) || null;
  return {
    id: user.id,
    role: user.role,
    client_id: user.client_id,
    allowed_client_ids: user.allowed_client_ids,
    email,
    isStaff: isStaff(user),
    isTeamDomain: !!email && email.toLowerCase().endsWith('@mercodigital.com'),
  };
}

export interface DocAccess {
  doc: any;
  shareUserIds: string[];
  isOwner: boolean;
  isShared: boolean;
  canView: boolean;
  canEdit: boolean;
}

/** Reglas de acceso a un documento (mismas que la RLS de `documents`). */
export async function getDocAccess(db: Db, docId: string, caller: DocCaller): Promise<DocAccess | null> {
  const { data: doc } = await db.from('documents').select('*').eq('id', docId).maybeSingle();
  if (!doc) return null;
  const { data: shares } = await db.from('document_shares').select('user_id').eq('document_id', docId);
  const shareUserIds = (shares || []).map((s: { user_id: string }) => s.user_id);
  const isOwner = doc.owner_id === caller.id;
  const isShared = shareUserIds.includes(caller.id);
  const canView = isOwner || isShared || caller.isStaff || (!!doc.client_id && caller.isTeamDomain);
  const canEdit = isOwner || isShared || caller.isStaff;
  return { doc, shareUserIds, isOwner, isShared, canView, canEdit };
}

export const DOC_KINDS = ['documento', 'nota', 'reunion', 'brief'] as const;
export const DOC_STATUSES = ['borrador', 'en_revision', 'aprobado', 'final'] as const;

export function cleanTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const t of input) {
    if (typeof t !== 'string') continue;
    const v = t.trim().slice(0, 40);
    if (v && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out.slice(0, 12);
}

export function htmlExcerpt(html: string | null | undefined, max = 160): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
