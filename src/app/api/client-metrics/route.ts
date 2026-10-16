import { NextResponse } from 'next/server';
import { getClientMetrics } from '@/lib/data-helper';
import { canAccessClient, getAdminClient, getRequestUser } from '@/lib/api-security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const user = await getRequestUser(request, getAdminClient());
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId es requerido' },
        { status: 400 }
      );
    }
    if (!canAccessClient(user, clientId)) {
      return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });
    }

    // Parsear rango de fechas si existe
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let dateRange = undefined;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    const metrics = await getClientMetrics(clientId, dateRange);

    return NextResponse.json({ data: metrics });
  } catch (err) {
    console.error('GET /api/client-metrics error:', err);
    return NextResponse.json(
      { error: 'Error al obtener métricas del cliente' },
      { status: 500 }
    );
  }
}
