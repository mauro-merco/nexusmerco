export const EFFORT_LABELS = { low: 'Bajo', medium: 'Medio', high: 'Alto', very_high: 'Muy alto' };
export type TaskClosure = { closure_effort: keyof typeof EFFORT_LABELS; actual_minutes: number | null; closure_summary: string };

export function validateTaskClosure(body: Record<string, unknown>): string | null {
  if (typeof body.closure_effort !== 'string' || !Object.hasOwn(EFFORT_LABELS, body.closure_effort)) return 'Elegí el esfuerzo que llevó la tarea';
  if (typeof body.closure_summary !== 'string' || !body.closure_summary.trim() || body.closure_summary.length > 10000) return 'Escribí un comentario de cierre (hasta 10.000 caracteres)';
  if (body.actual_minutes != null && (!Number.isSafeInteger(body.actual_minutes) || Number(body.actual_minutes) <= 0)) return 'Los minutos deben ser un número entero mayor a cero';
  return null;
}
