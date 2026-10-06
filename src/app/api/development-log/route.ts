import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type DevLogCategory = 'feature' | 'fix' | 'refactor' | 'docs' | 'style' | 'test' | 'chore';

export type DevLogEntry = {
  id: string;
  commit_hash: string | null;
  title: string;
  description: string;
  category: DevLogCategory;
  files_changed: string[] | null;
  author_id: string | null;
  created_at: string;
  tags: string[] | null;
  priority?: 'critical' | 'high' | 'normal' | 'low' | null;
  pr_url: string | null;
  deployed: boolean;
  deployed_at: string | null;
  author_name?: string;
  author_avatar?: string | null;
};

function getUserId(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    return payload.sub || null;
  } catch {
    return null;
  }
}

async function isAdminOrOperador(userId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  return data?.role === 'admin' || data?.role === 'operador';
}

// GET /api/development-log?days=30&category=feature&deployed=true
export async function GET(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const url = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get('days') || '90', 10)));
    const category = url.searchParams.get('category') as DevLogCategory | null;
    const deployedFilter = url.searchParams.get('deployed'); // "true" | "false" | null

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    fromDate.setHours(0, 0, 0, 0);

    let query = supabase
      .from('development_log')
      .select('*')
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(500);

    if (category) {
      query = query.eq('category', category);
    }

    if (deployedFilter === 'true') {
      query = query.eq('deployed', true);
    } else if (deployedFilter === 'false') {
      query = query.eq('deployed', false);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    // Enrich con datos de autor
    const authorIds = [...new Set((logs || []).map(l => l.author_id).filter(Boolean))];
    const { data: users } = authorIds.length
      ? await supabase.from('users').select('id, full_name, avatar_url').in('id', authorIds)
      : { data: [] };

    const userMap = new Map(
      (users || []).map(u => [u.id, { name: u.full_name, avatar: u.avatar_url }])
    );

    const enriched: DevLogEntry[] = (logs || []).map(log => ({
      ...log,
      author_name: log.author_id ? userMap.get(log.author_id)?.name : undefined,
      author_avatar: log.author_id ? userMap.get(log.author_id)?.avatar : undefined,
    }));

    return NextResponse.json({ data: enriched, days });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al cargar el log' },
      { status: 500 }
    );
  }
}

// POST /api/development-log
export async function POST(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!(await isAdminOrOperador(userId))) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const {
      commit_hash,
      title,
      description,
      category,
      files_changed,
      tags,
      pr_url,
      deployed,
    } = body;

    if (!title?.trim() || !description?.trim() || !category) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const validCategories: DevLogCategory[] = ['feature', 'fix', 'refactor', 'docs', 'style', 'test', 'chore'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('development_log')
      .insert({
        commit_hash: commit_hash || null,
        title: title.trim(),
        description: description.trim(),
        category,
        files_changed: files_changed || null,
        author_id: userId,
        tags: tags || null,
        pr_url: pr_url || null,
        deployed: deployed || false,
        deployed_at: deployed ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear entrada' },
      { status: 500 }
    );
  }
}

// PUT /api/development-log (mark as deployed)
export async function PUT(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!(await isAdminOrOperador(userId))) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { id, deployed } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta ID' }, { status: 400 });
    }

    const update: any = { deployed };
    if (deployed === true) {
      update.deployed_at = new Date().toISOString();
    } else if (deployed === false) {
      update.deployed_at = null;
    }

    const { data, error } = await supabase
      .from('development_log')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al actualizar' },
      { status: 500 }
    );
  }
}
