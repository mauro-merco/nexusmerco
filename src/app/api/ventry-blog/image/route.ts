import { NextResponse } from 'next/server';
import { getAdminClient, getRequestUser, isStaff, safeError } from '@/lib/api-security';

const BUCKET = 'blog-images';

const IMAGE_STYLES: Record<string, string> = {
  hyperrealistic: 'Hyperrealistic professional photography, natural materials and skin texture, physically accurate light, realistic depth of field, premium commercial camera look. Show people, nature, or unbranded abstract objects only.',
  cinematic: 'Cinematic photorealism, dramatic natural lighting, deep contrast, atmospheric perspective, premium film color grading. Use a purely visual scene without buildings, storefronts, streets, or text-bearing props.',
  editorial: 'High-end contemporary editorial photography, refined art direction, clean composition, sophisticated color palette, magazine-quality lighting. The image itself is an unprinted photograph, not a magazine cover or layout.',
  minimal: 'Minimalist premium photography, one clear unbranded focal subject, generous negative space, restrained color palette, soft natural light. No documents, packaging, signs, screens, or printed surfaces.',
  tech: 'Futuristic photorealistic technology scene made from abstract light, glass, metal, and geometric forms. No screens, interfaces, keyboards, devices, control panels, data visualizations, or text-bearing surfaces.',
};

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
    const content = plainText(String(body.content || '')).slice(0, 1400);
    const context = plainText(String(body.context || '')).slice(0, 500);
    const title = String(body.title || '').trim()
      || (content || context).split(/[.!?\n]/)[0].trim().slice(0, 120);
    const type = body.type === 'inline' ? 'inline' : 'cover';
    const style = IMAGE_STYLES[String(body.style || '')] || IMAGE_STYLES.hyperrealistic;
    if (!title) {
      return NextResponse.json({ error: 'Escribí algo en la nota antes de generar la imagen.' }, { status: 400 });
    }

    const purpose = type === 'cover'
      ? 'wide 16:9 editorial hero image for a digital marketing agency blog'
      : 'wide editorial illustration placed inside a professional blog article';
    const prompt = [
      'CREATE A COMPLETELY TEXT-FREE IMAGE. Visual content only.',
      `Create a ${purpose}.`,
      `Article title: ${title}.`,
      context
        ? `Section context: ${context}.`
        : content
          ? `Article context: ${content}.`
          : 'Build the visual concept from the article title.',
      style,
      'Exclude every object that could contain writing: signs, billboards, books, documents, newspapers, magazines, packaging, storefronts, clothing prints, license plates, screens, interfaces, charts, keyboards, labels, badges, and posters.',
      'ABSOLUTELY NO TEXT ANYWHERE. No words, letters, numbers, typography, captions, logos, brands, watermarks, UI, pseudo-text, glyphs, runes, or symbols resembling writing. If any object would normally contain text, leave its surface completely blank. Communicate only through people, light, color, shape, and composition.',
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
