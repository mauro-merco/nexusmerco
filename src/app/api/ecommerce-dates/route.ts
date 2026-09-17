import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');
    const month = searchParams.get('month');

    if (!client_id) {
      return NextResponse.json({ error: 'client_id required' }, { status: 400 });
    }

    let query = supabase
      .from('ecommerce_dates')
      .select('*')
      .eq('client_id', client_id)
      .order('start_date', { ascending: true });

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const monthStart = `${month}-01`;
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      // Include dates that overlap with the month
      query = query.lt('start_date', nextMonth).gte('end_date', monthStart);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_id, name, color, start_date, end_date } = body;

    if (!client_id || !name || !start_date || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (start_date > end_date) {
      return NextResponse.json({ error: 'start_date must be before or equal to end_date' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ecommerce_dates')
      .insert({ client_id, name, color: color || '#6366f1', start_date, end_date })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
