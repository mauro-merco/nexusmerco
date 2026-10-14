import { NextResponse } from 'next/server';
import { getAdminClient, getRequestUser, isStaff, safeError } from '@/lib/api-security';

const BUCKET = 'blog-images';

export const maxDuration = 300;

async function ensureBucket() {
  const supabase = getAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  return supabase;
}

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user || !isStaff(user)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const token = process.env.CLOUDFLARE_AI_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const model = process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-2-klein-4b';
    if (!token || !accountId) {
      return NextResponse.json({ error: 'La generación de imágenes no está configurada.' }, { status: 503 });
    }

    const body = await request.json();
    const title = String(body.title || '').trim();
    const content = plainText(String(body.content || '')).slice(0, 1400);
    const context = plainText(String(body.context || '')).slice(0, 500);
    const type = body.type === 'inline' ? 'inline' : 'cover';
    if (!title) {
      return NextResponse.json({ error: 'Escribí un título antes de generar la imagen.' }, { status: 400 });
    }

    const purpose = type === 'cover'
      ? 'wide 16:9 editorial hero image for a digital marketing agency blog'
      : 'wide editorial illustration placed inside a professional blog article';
    const prompt = [
      `Create a ${purpose}.`,
      `Article title: ${title}.`,
      context
        ? `Section context: ${context}.`
        : content
          ? `Article context: ${content}.`
          : 'Build the visual concept from the article title.',
      'Contemporary premium art direction, visually clear, sophisticated lighting, bold composition, brand-neutral.',
      'Do not include words, letters, captions, watermarks, logos, UI screenshots, or recognizable trademarks.',
    ].join(' ');

    const form = new FormData();
    form.append('prompt', prompt);
    const generated = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!generated.ok) {
      const detail = await generated.text();
      throw new Error(`Cloudflare AI respondió HTTP ${generated.status}: ${detail}`);
    }

    const result = await generated.json();
    const encoded = String(result?.result?.image || result?.image || '').replace(/^data:image\/\w+;base64,/, '');
    if (!encoded) throw new Error('Cloudflare AI no devolvió una imagen.');
    const image = Buffer.from(encoded, 'base64');
    if (!image.length) throw new Error('La imagen generada está vacía.');

    const supabase = await ensureBucket();
    const fileName = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, image, {
      contentType: 'image/png',
      cacheControl: '31536000',
    });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    const alt = type === 'cover' ? `Portada de ${title}` : `Ilustración para ${title}`;
    return NextResponse.json({ data: { url: publicUrl, alt } });
  } catch (error) {
    console.error('POST /api/ventry-blog/image:', safeError(error));
    return NextResponse.json({ error: safeError(error, 'No se pudo generar la imagen') }, { status: 502 });
  }
}
