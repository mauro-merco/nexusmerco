'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TASK_ROLE_CONFIG, TASK_ROLES, TASK_STATUS_CONFIG, taskTypeInfo } from '@/lib/task-config';
import { WorkStatistics } from '@/components/work-statistics';
import {
  Mail,
  ArrowLeft,
  FileText,
  StickyNote,
  KanbanSquare,
  Loader2,
  Send,
  X,
  CheckCircle2,
  Clock,
  Activity,
  History,
  Layers,
} from 'lucide-react';
import type { PublicProfile, TaskRole } from '@/lib/types';

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<'tasks' | 'docs' | 'notes'>('tasks');
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${id}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'No se pudo cargar el perfil');
        setProfile(null);
        return;
      }
      setProfile(json.data);
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchProfile();
  }, [id, fetchProfile]);

  const isSelf = !!user && user.id === id;

  const sendMessage = async () => {
    if (!msgText.trim() || !user) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipient_id: id, content: msgText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al enviar');
      setSent(true);
      setMsgText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile?.user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-muted-foreground">{error || 'Perfil no disponible'}</p>
        <Button variant="outline">
          <Link href="/dashboard">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  const p = profile.user;
  const initials = (p.full_name || p.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const firstName = (p.full_name || '').split(' ')[0] || p.full_name || p.email || '';

  const tasksList = profile.tasks || [];
  const workItems = profile.work_items || [];
  const activeTasks = tasksList.filter(t => t.status !== 'cerrada');
  const completedTasks = tasksList.filter(t => t.status === 'cerrada');
  const activeWork = workItems.filter(item => item.status !== 'posteado');
  const completedWork = workItems.filter(item => item.status === 'posteado');

  const tasksByRole = (role: TaskRole) => tasksList.filter(t => (t.my_roles || (t.my_role ? [t.my_role] : [])).includes(role));
  const workByRole = (role: TaskRole) => workItems.filter(item => (item.my_roles || [item.my_role]).includes(role));
  const roleTotal = (role: TaskRole) => tasksByRole(role).length + workByRole(role).length;
  const roleActive = (role: TaskRole) => tasksByRole(role).filter(t => t.status !== 'cerrada').length + workByRole(role).filter(item => item.status !== 'posteado').length;
  const sortActiveFirst = (list: typeof tasksList) =>
    [...list].sort((a, b) => (a.status === 'cerrada' ? 1 : 0) - (b.status === 'cerrada' ? 1 : 0));

  const tabCounts = {
    tasks: tasksList.length + workItems.length,
    docs: profile.documents?.length || 0,
    notes: profile.notes?.length || 0,
  };

  const stats = [
    { label: 'Trabajos activos', value: activeTasks.length + activeWork.length, icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { label: 'Completados', value: completedTasks.length + completedWork.length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Historial total', value: tasksList.length + workItems.length, icon: History, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <button
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push('/dashboard');
            }}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted/60 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <div className="bg-gradient-tech flex h-8 w-8 items-center justify-center rounded-xl">
              <span className="text-xs font-bold text-white">M</span>
            </div>
            <span className="text-gradient-tech text-sm font-bold">Nexus</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="h-8 text-xs">
              <Link href="/dashboard">Ir al dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Profile card */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-lg">
          <div className="bg-gradient-tech rounded-full p-[3px] shadow-lg">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.full_name} className="h-28 w-28 rounded-full object-cover border-4 border-background" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-background bg-background">
                <span className="text-gradient-tech text-4xl font-bold">{initials}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{p.full_name}</h1>
            {p.headline && <p className="text-gradient-tech text-sm font-semibold">{p.headline}</p>}
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-[10px] capitalize">
                {p.role}
              </Badge>
              {isSelf && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {p.is_public ? 'Perfil público' : 'Perfil oculto'}
                </Badge>
              )}
            </div>
          </div>

          {p.bio && <p className="max-w-md text-sm text-muted-foreground">{p.bio}</p>}

          <div className="mt-1 flex gap-2">
            {isSelf ? (
              <Button variant="cta" size="cta" className="gap-2">
                <Link href="/">Editar mi perfil</Link>
              </Button>
            ) : (
              <Button
                variant="cta"
                size="cta"
                className="gap-2"
                onClick={() => {
                  setMsgOpen(true);
                  setSent(false);
                }}
              >
                <Mail className="h-4 w-4" /> Enviar mensaje
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', bg, color)}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none">{value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Roles */}
        {(tasksList.length > 0 || workItems.length > 0) && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4" /> Rol en los proyectos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TASK_ROLES.map(roleKey => {
                const cfg = TASK_ROLE_CONFIG[roleKey];
                const Icon = cfg.icon;
                const total = roleTotal(roleKey);
                const active = roleActive(roleKey);
                return (
                  <div key={roleKey} className={cn('rounded-xl border bg-card p-4', cfg.borderClass)}>
                    <div className="flex items-center gap-2">
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', cfg.bgColorClass, cfg.colorClass)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xl font-bold leading-none">{total}</p>
                        <p className={cn('truncate text-[10px] font-medium', cfg.colorClass)}>{cfg.shortLabel}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">{active} activo{active !== 1 ? 's' : ''}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Participation sentences */}
        {tasksList.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Participación en proyectos</h2>
            <div className="space-y-3">
              {TASK_ROLES.map(roleKey => {
                const items = sortActiveFirst(tasksByRole(roleKey));
                if (items.length === 0) return null;
                const cfg = TASK_ROLE_CONFIG[roleKey];
                const Icon = cfg.icon;
                return (
                  <div key={roleKey} className="rounded-xl border bg-card/60 p-4">
                    <p className={cn('flex items-center gap-2 text-xs font-semibold mb-3', cfg.colorClass)}>
                      <Icon className="h-4 w-4" />
                      {cfg.label} · {items.length}
                    </p>
                    <ul className="space-y-2">
                      {items.map(t => {
                        const sCfg = TASK_STATUS_CONFIG[t.status];
                        const isClosed = t.status === 'cerrada';
                        return (
                          <li key={t.id} className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-muted-foreground">
                              <strong className="text-foreground">{firstName}</strong>{' '}
                              {cfg.verb} «<strong className="text-foreground/90">{t.title}</strong>»
                            </span>
                            {t.client?.name && <Badge variant="secondary" className="text-[10px]">{t.client.name}</Badge>}
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              sCfg.bgColorClass, sCfg.colorClass,
                            )}>
                              {isClosed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {sCfg.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <WorkStatistics userId={id} />

        {/* Stats + tabs */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { key: 'tasks' as const, label: 'Tareas', icon: KanbanSquare },
            { key: 'docs' as const, label: 'Documentos', icon: FileText },
            { key: 'notes' as const, label: 'Notas', icon: StickyNote },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-3 transition-all hover:bg-muted/40',
                tab === key ? 'border-primary/40 bg-gradient-tech-soft' : 'border-border bg-card'
              )}
            >
              <Icon className={cn('h-4 w-4', tab === key ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-base font-bold">{tabCounts[key]}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6 space-y-3">
          {tab === 'tasks' && (
            <>
               {tasksList.length === 0 && workItems.length === 0 && (
                 <p className="text-center py-10 text-sm text-muted-foreground">Sin trabajos asignados</p>
              )}
              {sortActiveFirst(tasksList).map((t) => {
                const taskRoles = t.my_roles || (t.my_role ? [t.my_role] : []);
                return (
                  <div key={t.id} className="flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        t.status === 'cerrada'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-muted/60 text-muted-foreground'
                      )}
                    >
                      {t.status === 'cerrada' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {taskRoles.map(role => {
                          const cfg = TASK_ROLE_CONFIG[role];
                          const Icon = cfg.icon;
                          return <span key={role} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.bgColorClass, cfg.colorClass)}><Icon className="h-3 w-3" /> {cfg.shortLabel}</span>;
                        })}
                        {taskTypeInfo(t.task_type) && (() => {
                          const info = taskTypeInfo(t.task_type)!;
                          const cat = info.category;
                          const Icon = cat.icon;
                          return (
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', cat.bgColorClass, cat.colorClass)}>
                              <Icon className="h-3 w-3" />
                              <span className="max-w-[180px] truncate">{info.label}</span>
                            </span>
                          );
                        })()}
                        {t.client?.name && <Badge variant="secondary" className="text-[10px]">{t.client.name}</Badge>}
                        <Badge variant="outline" className={cn('text-[10px] capitalize', TASK_STATUS_CONFIG[t.status].colorClass)}>{t.status.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{t.priority}</Badge>
                        {t.due_date && (
                          <span className="text-[10px] text-muted-foreground">
                            Vence {new Date(t.due_date).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
               })}
               {workItems.length > 0 && (
                 <div className="pt-3 space-y-2">
                   <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Piezas de Redes y ADS</p>
                   {workItems.map(item => {
                     return (
                       <div key={`${item.source}-${item.id}`} className="flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-sm">
                         <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', item.status === 'posteado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-violet-500/10 text-violet-500')}>
                           <Layers className="h-4 w-4" />
                         </span>
                         <div className="min-w-0 flex-1">
                           <p className="truncate text-sm font-semibold">{item.title}</p>
                           <div className="mt-1.5 flex flex-wrap items-center gap-2">
                             {(item.my_roles || [item.my_role]).map(role => {
                               const cfg = TASK_ROLE_CONFIG[role];
                               const Icon = cfg.icon;
                               return <span key={role} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.bgColorClass, cfg.colorClass)}><Icon className="h-3 w-3" /> {cfg.shortLabel}</span>;
                             })}
                             <Badge variant="secondary" className="text-[10px]">{item.source === 'ads' ? 'ADS' : 'Redes'}</Badge>
                             {item.client?.name && <Badge variant="outline" className="text-[10px]">{item.client.name}</Badge>}
                             <Badge variant="outline" className="text-[10px] capitalize">{item.status.replace(/_/g, ' ')}</Badge>
                             <span className="text-[10px] text-muted-foreground">{new Date(`${item.publish_date}T12:00:00`).toLocaleDateString('es-AR')}</span>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
            </>
          )}

          {tab === 'docs' && (
            <>
              {(profile.documents || []).length === 0 && (
                <p className="text-center py-10 text-sm text-muted-foreground">Sin documentos públicos</p>
              )}
              {(profile.documents || []).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm transition-colors hover:bg-muted/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Actualizado {new Date(d.updated_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  {d.content && <span className="line-clamp-2 hidden max-w-[220px] text-[11px] text-muted-foreground sm:block">{d.content.replace(/<[^>]+>/g, ' ').trim().slice(0, 100)}</span>}
                </div>
              ))}
            </>
          )}

          {tab === 'notes' && (
            <>
              {(profile.notes || []).length === 0 && (
                <p className="text-center py-10 text-sm text-muted-foreground">Sin notas públicas</p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(profile.notes || []).map((n) => (
                  <div
                    key={n.id}
                    className="rounded-2xl border bg-card p-4 shadow-sm"
                    style={{ backgroundColor: n.color }}
                  >
                    {n.title && <p className="text-sm font-semibold line-clamp-1">{n.title}</p>}
                    {n.content && <p className="mt-1 text-xs opacity-80 line-clamp-3">{n.content}</p>}
                    {n.category && <Badge variant="outline" className="mt-2 text-[10px]">{n.category}</Badge>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Message dialog */}
      {msgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMsgOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border bg-popover p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Enviar mensaje a {p.full_name}
              </h3>
              <button onClick={() => setMsgOpen(false)} className="rounded-lg p-1 hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Iniciá sesión para enviar mensajes.</p>
                <Button variant="cta" size="cta" className="w-full">
                  <Link href="/">Iniciar sesión</Link>
                </Button>
              </div>
            ) : (
              <>
                {sent ? (
                  <div className="space-y-3 text-center py-4">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                    <p className="text-sm font-medium">Mensaje enviado</p>
                    <Button variant="outline" size="sm" onClick={() => setMsgOpen(false)}>Cerrar</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      autoFocus
                      placeholder="Escribí tu mensaje..."
                      value={msgText}
                      onChange={(e) => setMsgText(e.target.value)}
                      className="min-h-[90px]"
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-2">
                      <Button variant="cta" size="cta" className="flex-1 gap-2" onClick={sendMessage} disabled={sending || !msgText.trim()}>
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar
                      </Button>
                      <Button variant="outline" size="cta" onClick={() => setMsgOpen(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
