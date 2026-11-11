import { FileText, StickyNote, Users2, Lightbulb, PencilLine, Eye, CheckCircle2, BadgeCheck, type LucideIcon } from 'lucide-react';
import type { DocumentKind, DocumentStatus } from '@/lib/types';

export const DOC_KIND_CONFIG: Record<DocumentKind, { label: string; plural: string; icon: LucideIcon; colorClass: string; bgClass: string }> = {
  documento: { label: 'Documento', plural: 'Documentos', icon: FileText, colorClass: 'text-tint-blue-foreground', bgClass: 'bg-tint-blue' },
  nota: { label: 'Nota', plural: 'Notas', icon: StickyNote, colorClass: 'text-tint-amber-foreground', bgClass: 'bg-tint-amber' },
  reunion: { label: 'Reunión', plural: 'Reuniones', icon: Users2, colorClass: 'text-tint-teal-foreground', bgClass: 'bg-tint-teal' },
  brief: { label: 'Brief', plural: 'Briefs', icon: Lightbulb, colorClass: 'text-tint-red-foreground', bgClass: 'bg-tint-red' },
};
export const DOC_KINDS: DocumentKind[] = ['documento', 'nota', 'reunion', 'brief'];

export const DOC_STATUS_CONFIG: Record<DocumentStatus, { label: string; icon: LucideIcon; colorClass: string; bgClass: string; dot: string }> = {
  borrador: { label: 'Borrador', icon: PencilLine, colorClass: 'text-muted-foreground', bgClass: 'bg-muted', dot: 'bg-slate-400' },
  en_revision: { label: 'En revisión', icon: Eye, colorClass: 'text-amber-700 dark:text-amber-300', bgClass: 'bg-amber-500/15', dot: 'bg-amber-500' },
  aprobado: { label: 'Aprobado', icon: CheckCircle2, colorClass: 'text-emerald-700 dark:text-emerald-300', bgClass: 'bg-emerald-500/15', dot: 'bg-emerald-500' },
  final: { label: 'Final', icon: BadgeCheck, colorClass: 'text-blue-700 dark:text-blue-300', bgClass: 'bg-blue-500/15', dot: 'bg-blue-500' },
};
export const DOC_STATUSES: DocumentStatus[] = ['borrador', 'en_revision', 'aprobado', 'final'];

export function docKind(k?: string | null) { return DOC_KIND_CONFIG[(k as DocumentKind) || 'documento'] || DOC_KIND_CONFIG.documento; }
export function docStatus(s?: string | null) { return DOC_STATUS_CONFIG[(s as DocumentStatus) || 'borrador'] || DOC_STATUS_CONFIG.borrador; }

/** Colores de nota (pastel en claro; se oscurecen un poco en oscuro con opacidad). */
export const NOTE_COLORS = ['#FEF3C7', '#FEE2E2', '#DBEAFE', '#DCFCE7', '#EDE9FE', '#FCE7F3', '#E0F2FE', '#F3F4F6'];

const TAG_PALETTE = [
  'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  'bg-pink-500/15 text-pink-700 dark:text-pink-300',
];

/** Cada etiqueta tiene siempre el mismo color (hash del texto). */
export function tagClass(tag: string) {
  let h = 0;
  for (const ch of tag.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

export interface DocTemplate {
  key: string;
  label: string;
  description: string;
  kind: DocumentKind;
  icon: string;
  title: string;
  tags?: string[];
  content: () => string;
}

const today = () => new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    key: 'blank', label: 'Documento en blanco', description: 'Empezá desde cero.', kind: 'documento', icon: '📄',
    title: 'Sin título', content: () => '',
  },
  {
    key: 'note', label: 'Nota rápida', description: 'Una idea corta, con color, como un post-it.', kind: 'nota', icon: '📝',
    title: 'Nota', content: () => '',
  },
  {
    key: 'meeting', label: 'Notas de reunión', description: 'Asistentes, temas, decisiones y próximos pasos.', kind: 'reunion', icon: '🤝',
    title: `Reunión ${today()}`, tags: ['reunión'],
    content: () => `<table><tbody><tr><td><strong>Fecha</strong></td><td>${today()}</td></tr><tr><td><strong>Participantes</strong></td><td>@</td></tr><tr><td><strong>Grabación</strong></td><td>Link</td></tr></tbody></table>
<h2>Temas</h2><ul><li>Tema 1</li></ul>
<h2>Decisiones</h2><div class="doc-callout" data-tone="success"><p>Qué se decidió.</p></div>
<h2>Próximos pasos</h2><ul data-type="checklist"><li data-checked="false">Tarea · responsable · fecha</li></ul>`,
  },
  {
    key: 'onboarding', label: 'Ficha de onboarding', description: 'Datos del cliente, contactos y preguntas clave.', kind: 'brief', icon: '🚀',
    title: 'Ficha de onboarding', tags: ['onboarding'],
    content: () => `<div class="doc-callout" data-tone="warning"><p><strong>¡IMPORTANTE!</strong> Si hay varios servicios, completá una ficha por servicio. Respondé las preguntas antes de grabar el video.</p></div>
<table><tbody><tr><td><strong>Dato</strong></td><td><strong>Valor</strong></td></tr><tr><td>Nombre cliente</td><td></td></tr><tr><td>Empresa</td><td></td></tr><tr><td>Email</td><td></td></tr><tr><td>WhatsApp / Tel</td><td></td></tr><tr><td>Sitio web</td><td></td></tr><tr><td>Reunión de cierre</td><td>${today()}</td></tr></tbody></table>
<h3>Video explicativo (grabar y subir)</h3><ul data-type="checklist"><li data-checked="false">Completar las preguntas</li><li data-checked="false">Grabar el video sobre esta ficha</li></ul>
<h3>Preguntas</h3><p><strong>1) ¿Con quién vamos a interactuar o trabajar dentro del proyecto?</strong></p><ul><li></li></ul><p><strong>2) ¿Cuál es el objetivo principal?</strong></p><ul><li></li></ul><p><strong>3) ¿Qué accesos necesitamos?</strong></p><ul><li></li></ul>`,
  },
  {
    key: 'brief', label: 'Brief creativo', description: 'Objetivo, público, mensaje y entregables.', kind: 'brief', icon: '🎯',
    title: 'Brief creativo', tags: ['brief'],
    content: () => `<h2>Objetivo</h2><p>Qué queremos lograr.</p><h2>Público</h2><p>A quién le hablamos.</p><h2>Mensaje clave</h2><blockquote>Una frase.</blockquote><h2>Entregables</h2><ul data-type="checklist"><li data-checked="false">Pieza 1</li></ul><h2>Referencias</h2><p>Links e inspiración.</p>`,
  },
  {
    key: 'report', label: 'Informe mensual', description: 'Resultados, aprendizajes y plan del mes siguiente.', kind: 'documento', icon: '📊',
    title: 'Informe mensual', tags: ['informe'],
    content: () => `<h2>Resumen</h2><div class="doc-callout" data-tone="info"><p>Lo más importante del mes en 3 líneas.</p></div><h2>Resultados</h2><table><tbody><tr><td><strong>Métrica</strong></td><td><strong>Mes anterior</strong></td><td><strong>Este mes</strong></td></tr><tr><td></td><td></td><td></td></tr></tbody></table><h2>Aprendizajes</h2><ul><li></li></ul><h2>Plan del próximo mes</h2><ul data-type="checklist"><li data-checked="false"></li></ul>`,
  },
];
