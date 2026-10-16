import { NextResponse } from 'next/server';
import { getAdminClient, getRequestUser } from '@/lib/api-security';

/**
 * POST /api/clients/init-multipoint
 * Inicializa el cliente "Multipoint" si no existe
 */
export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('clients')
      .select('id, name')
      .ilike('name', 'multipoint')
      .single();

    if (existing) {
      return NextResponse.json({
        message: 'Cliente Multipoint ya existe',
        data: existing,
        created: false,
      });
    }

    // Crear el cliente Multipoint
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: 'Multipoint',
        logo_url: '',
        description: 'Cliente inicial del sistema - E-commerce multicanal',
        industry: 'E-commerce',
        campaign_types: ['google_ads', 'meta_ads', 'analytics'],
        plan: 'enterprise',
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      message: 'Cliente Multipoint creado exitosamente',
      data,
      created: true,
    });
  } catch (err) {
    console.error('POST /api/clients/init-multipoint error:', err);
    return NextResponse.json(
      { error: 'Error al inicializar cliente Multipoint' },
      { status: 500 }
    );
  }
}
