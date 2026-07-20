import { NextResponse } from 'next/server';
import { getClientMetrics } from '@/lib/data-helper';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId es requerido' },
        { status: 400 }
      );
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
