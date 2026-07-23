import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, role')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('GET /api/auth/profile error:', err);
    return NextResponse.json({ error: 'Error fetching profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, full_name, email, avatar_url } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = getAdmin();

    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    let result;

    if (existing) {
      result = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select('id, email, full_name, avatar_url, role')
        .single();
    } else {
      const emailVal = email || 'user@example.com';
      result = await supabase
        .from('users')
        .insert({ id: userId, email: emailVal, ...updates })
        .select('id, email, full_name, avatar_url, role')
        .single();
    }

    if (result.error) throw result.error;
    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error('PUT /api/auth/profile error:', err);
    return NextResponse.json({ error: 'Error updating profile' }, { status: 500 });
  }
}
