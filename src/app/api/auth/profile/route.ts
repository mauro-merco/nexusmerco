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
      .select('id, email, full_name, avatar_url, role, visible_modules, totp_enabled, client_id')
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
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');

    let userId: string;
    let fullName: string | undefined;
    let email: string | undefined;
    let file: File | null = null;

    if (isMultipart) {
      const formData = await request.formData();
      userId = formData.get('userId') as string;
      fullName = (formData.get('full_name') as string) || undefined;
      email = (formData.get('email') as string) || undefined;
      file = formData.get('file') as File | null;
    } else {
      const body = await request.json();
      userId = body.userId;
      fullName = body.full_name;
      email = body.email;
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const supabase = getAdmin();
    const updates: Record<string, unknown> = {};

    if (fullName !== undefined) updates.full_name = fullName;
    if (email !== undefined) updates.email = email;

    if (file) {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw new Error(`Error al subir avatar: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      updates.avatar_url = publicUrl;
    }

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
