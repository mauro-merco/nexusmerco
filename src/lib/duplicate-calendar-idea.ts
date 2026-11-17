import type { SupabaseClient } from '@supabase/supabase-js';
import { enrichIdeasWithAssignees } from '@/lib/idea-assignees-server';
import { logActivity } from '@/lib/activity-events';

export async function duplicateCalendarIdea(db: SupabaseClient, type: 'social' | 'ads', sourceId: string, clientId: string, actorId: string) {
  const table = type === 'ads' ? 'ads_ideas' : 'social_ideas';
  const assignments = type === 'ads' ? 'ads_idea_assignees' : 'social_idea_assignees';
  const entityType = type === 'ads' ? 'ads_idea' : 'social_idea';
  const { data: source, error: sourceError } = await db.from(table).select('*').eq('id', sourceId).eq('client_id', clientId).single();
  if (sourceError) throw sourceError;
  const payload: Record<string, unknown> = { client_id: clientId, author_id: actorId, title: `${source.title} (copia)`, status: 'borrador' };
  for (const key of ['description', 'brief', 'eje_contenido', 'copy_text', 'responsable', 'post_type', 'publish_date', 'needs_client_material', 'client_material_note']) {
    if (key in source) payload[key] = source[key];
  }
  const { data: people, error: peopleError } = await db.from(assignments).select('user_id, role').eq('idea_id', sourceId);
  if (peopleError) throw peopleError;
  const { data: links, error: linksError } = await db.from('material_links').select('title, url').eq('entity_type', entityType).eq('entity_id', sourceId);
  if (linksError) throw linksError;
  const attachments = type === 'social' ? await db.from('social_attachments').select('type, url, preview_url, name').eq('idea_id', sourceId) : { data: [], error: null };
  if (attachments.error) throw attachments.error;
  const { data: copy, error } = await db.from(table).insert(payload).select().single();
  if (error) throw error;
  try {
    if (people?.length) {
      const result = await db.from(assignments).insert(people.map(person => ({ ...person, idea_id: copy.id })));
      if (result.error) throw result.error;
    }
    if (links?.length) {
      const result = await db.from('material_links').insert(links.map(link => ({ ...link, entity_type: entityType, entity_id: copy.id, created_by: actorId })));
      if (result.error) throw result.error;
    }
    if (attachments.data?.length) {
      const result = await db.from('social_attachments').insert(attachments.data.map(attachment => ({ ...attachment, idea_id: copy.id })));
      if (result.error) throw result.error;
    }
    const [enriched] = await enrichIdeasWithAssignees(db, assignments, [copy]);
    await logActivity(db, { clientId, area: type, entityType, entityId: copy.id, entityTitle: copy.title, action: 'created', detail: `Duplicó ${source.title}`, actorId });
    return enriched;
  } catch (failure) {
    const linksCleanup = await db.from('material_links').delete().eq('entity_type', entityType).eq('entity_id', copy.id);
    const ideaCleanup = await db.from(table).delete().eq('id', copy.id).eq('client_id', clientId);
    if (linksCleanup.error || ideaCleanup.error) {
      console.error('Incomplete calendar duplicate cleanup', { id: copy.id, failure, linksError: linksCleanup.error, ideaError: ideaCleanup.error });
      throw new Error(`No se pudo completar la copia ni su limpieza (ID: ${copy.id}).`);
    }
    throw failure;
  }
}
