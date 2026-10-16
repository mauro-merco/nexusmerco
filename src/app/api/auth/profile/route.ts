import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/api-security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function GET(request: Request) {
  try {
    const supabase = getAdmin();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const userId = user.id;
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, role, visible_modules, allowed_client_ids, totp_enabled, client_id, bio, headline, is_public')
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
    let bio: string | undefined;
    let headline: string | undefined;
    let isPublic: boolean | undefined;
    let file: File | null = null;

    if (isMultipart) {
      const formData = await request.formData();
      userId = formData.get('userId') as string;
      fullName = (formData.get('full_name') as string) || undefined;
      bio = (formData.get('bio') as string) || undefined;
      headline = (formData.get('headline') as string) || undefined;
      const pub = formData.get('is_public');
      if (pub !== null) isPublic = pub === 'true' || pub === 'on' || pub === '1';
      file = formData.get('file') as File | null;
    } else {
      const body = await request.json();
      userId = body.userId;
      fullName = body.full_name;
      bio = body.bio;
      headline = body.headline;
      isPublic = body.is_public;
    }

    const supabase = getAdmin();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    userId = user.id;
    const updates: Record<string, unknown> = {};

    if (fullName !== undefined) updates.full_name = fullName;
    if (bio !== undefined) updates.bio = bio;
    if (headline !== undefined) updates.headline = headline;
    if (isPublic !== undefined) updates.is_public = !!isPublic;

    if (file) {
      const allowedTypes: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
      const ext = allowedTypes[file.type];
      if (!ext || file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'La imagen debe ser PNG, JPG, WEBP o GIF y pesar menos de 2 MB.' }, { status: 400 });
      }
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

    const result = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, email, full_name, avatar_url, role')
      .single();

    if (result.error) throw result.error;
    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error('PUT /api/auth/profile error:', err);
    return NextResponse.json({ error: 'Error updating profile' }, { status: 500 });
  }
}
