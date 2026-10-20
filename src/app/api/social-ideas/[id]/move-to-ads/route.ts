import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getRequestUser } from '@/lib/api-security';
import { logActivity } from '@/lib/activity-events';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabase();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const { publish_date, ecommerce_date_id } = body;

    if (!publish_date) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });
    }

    // 1. Get the social idea
    const { data: socialIdea, error: fetchError } = await supabase
      .from('social_ideas')
      .select('*, assignees:social_idea_assignees(user_id, role)')
      .eq('id', id)
      .single();

    if (fetchError || !socialIdea) {
      return NextResponse.json({ error: 'Idea no encontrada' }, { status: 404 });
    }

    // 2. Create in ads_ideas
    const { data: adsIdea, error: insertError } = await supabase
      .from('ads_ideas')
      .insert({
        client_id: socialIdea.client_id,
        title: socialIdea.title,
        description: socialIdea.description,
        brief: socialIdea.brief,
        eje_contenido: socialIdea.eje_contenido,
        copy_text: socialIdea.copy_text,
        responsable: socialIdea.responsable,
        post_type: socialIdea.post_type,
        status: socialIdea.status,
        publish_date,
        ecommerce_date_id: ecommerce_date_id || null,
        author_id: user.id,
        needs_client_material: socialIdea.needs_client_material || false,
        client_material_note: socialIdea.client_material_note || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Copy assignees
    if (socialIdea.assignees && socialIdea.assignees.length > 0) {
      const assigneesToInsert = socialIdea.assignees.map((a: any) => ({
        idea_id: adsIdea.id,
        user_id: a.user_id,
        role: a.role,
      }));

      await supabase.from('ads_idea_assignees').insert(assigneesToInsert);
    }

    // 4. Copy attachments
    const { data: attachments } = await supabase
      .from('social_attachments')
      .select('*')
      .eq('idea_id', id);

    if (attachments && attachments.length > 0) {
      const attachmentsToInsert = attachments.map((att) => ({
        idea_id: adsIdea.id,
        type: att.type,
        url: att.url,
        preview_url: att.preview_url,
        name: att.name,
      }));

      await supabase.from('ads_attachments').insert(attachmentsToInsert);
    }

    // 5. Delete the social idea (cascade deletes comments, attachments, assignees)
    const { error: deleteError } = await supabase
      .from('social_ideas')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 6. Log activity
    await logActivity(supabase, {
      clientId: socialIdea.client_id,
      area: 'social',
      entityType: 'social_idea',
      entityId: id,
      entityTitle: socialIdea.title,
      action: 'moved_to_ads',
      detail: `Movida al calendario ADS (${publish_date})`,
      actorId: user.id,
    });

    return NextResponse.json({ data: adsIdea });
  } catch (err) {
    console.error('POST /api/social-ideas/[id]/move-to-ads error:', err);
    return NextResponse.json({ error: 'Error al mover la idea' }, { status: 500 });
  }
}
