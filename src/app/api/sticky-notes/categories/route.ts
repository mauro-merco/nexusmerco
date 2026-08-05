import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function GET(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('sticky_notes')
      .select('category, category_color')
      .eq('user_id', userId)
      .not('category', 'is', null)
      .neq('category', '');

    if (error) throw error;

    const categoryMap = new Map<string, string>();
    for (const row of data || []) {
      if (!categoryMap.has(row.category)) {
        categoryMap.set(row.category, row.category_color || '#6366f1');
      }
    }

    const categories = Array.from(categoryMap.entries()).map(([name, color]) => ({
      name,
      color,
      count: (data || []).filter(d => d.category === name).length,
    }));

    return NextResponse.json({ categories });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { category } = await request.json();

    const { error } = await supabase
      .from('sticky_notes')
      .update({ category: '', category_color: null })
      .eq('user_id', userId)
      .eq('category', category);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { oldCategory, newCategory, newColor } = await request.json();

    const { error } = await supabase
      .from('sticky_notes')
      .update({ category: newCategory, category_color: newColor })
      .eq('user_id', userId)
      .eq('category', oldCategory);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
