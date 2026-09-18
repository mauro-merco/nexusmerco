'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/lib/task-config';
import type { Task } from '@/lib/types';
import { Loader2, LogIn, Eye, EyeOff, Lock, Calendar, User, Paperclip, MessageSquare, Link as LinkIcon, ArrowLeft } from 'lucide-react';

interface PublicTaskComment {
  id: string;
  content: string;
  created_at: string;
  user: { full_name?: string; avatar_url?: string } | null;
}
interface PublicTaskAttachment { id: string; url: string; name: string }
interface PublicTaskData extends Task {
  comments: PublicTaskComment[];
  attachments: PublicTaskAttachment[];
}

type ViewState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'needs_login' }
  | { status: 'forbidden' }
  | { status: 'public_view'; task: PublicTaskData }
  | { status: 'private_interactive'; task: Task };

const bg = 'min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e]';

export default function SharedTaskPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(true);
  const [modalClosed, setModalClosed] = useState(false);

  useEffect(() => { params.then(p => setToken(p.token)); }, [params]);

  const load = useCallback(async (t: string) => {
    setState({ status: 'loading' });
    // The app's source of truth for "am I logged in" is the persisted Zustand
    // store (nexus-auth), not the raw Supabase session — e.g. 2FA accounts sign
    // out of Supabase right after login but stay "logged in" via this token.
    let authToken: string | null = null;
    try {
      const nexusRaw = localStorage.getItem('nexus-auth');
      if (nexusRaw) {
        const nexus = JSON.parse(nexusRaw);
        authToken = nexus?.state?.token || null;
      }
    } catch { /* ignore */ }
    if (!authToken) {
      try {
        const { getSupabase } = await import('@/lib/supabase');
        const { data: { session } } = await getSupabase().auth.getSession();
        authToken = session?.access_token || null;
      } catch { /* ignore */ }
    }

    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      const res = await fetch(`/api/tasks/public/${t}`, { headers });
      const json = await res.json();
      if (res.status === 404) { setState({ status: 'not_found' }); return; }
      if (res.status === 401) { setState({ status: 'needs_login' }); return; }
      if (res.status === 403) { setState({ status: 'forbidden' }); return; }
      if (!res.ok || !json.data) { setState({ status: 'not_found' }); return; }

      if (json.access === 'private') {
        fetch('/api/users').then(r => r.json()).then(j => setUsers(j.data || [])).catch(() => {});
        setModalOpen(true);
        setModalClosed(false);
        setState({ status: 'private_interactive', task: json.data });
      } else {
        setState({ status: 'public_view', task: json.data });
      }
    } catch {
      setState({ status: 'not_found' });
    }
  }, []);

  useEffect(() => { if (token) load(token); }, [token, load]);

  if (state.status === 'loading' || !token) {
    return <div className={cn(bg, 'flex items-center justify-center')}><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (state.status === 'not_found') {
    return (
      <div className={cn(bg, 'flex items-center justify-center p-6 text-center')}>
        <BackToApp />
        <p className="text-muted-foreground">Tarea no encontrada. El link puede haber cambiado o la tarea fue eliminada.</p>
      </div>
    );
  }

  if (state.status === 'needs_login') {
    return (
      <>
        <BackToApp />
        <LoginGate onLoggedIn={() => load(token)} />
      </>
    );
  }

  if (state.status === 'forbidden') {
    return (
      <div className={cn(bg, 'flex items-center justify-center p-6')}>
        <BackToApp />
        <Card className="max-w-sm w-full border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="p-6 text-center space-y-3">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <h1 className="font-semibold">Tarea privada</h1>
            <p className="text-sm text-muted-foreground">Esta tarea es privada. Solo usuarios de Merco Digital pueden verla.</p>
            <Button variant="outline" size="sm" onClick={async () => {
              const { getSupabase } = await import('@/lib/supabase');
              await getSupabase().auth.signOut();
              localStorage.removeItem('nexus-auth');
              load(token);
            }}>Iniciar sesión con otra cuenta</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === 'private_interactive') {
    return (
      <div className={bg}>
        <BackToApp />
        {modalClosed ? (
          <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
            <p className="text-sm text-muted-foreground">Cerraste la tarea.</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { setModalOpen(true); setModalClosed(false); }}>Ver tarea de nuevo</Button>
              <Button onClick={() => { window.location.href = '/dashboard'; }} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Volver a la app
              </Button>
            </div>
          </div>
        ) : (
          <TaskDetailModal
            task={state.task}
            open={modalOpen}
            onOpenChange={(open) => { setModalOpen(open); if (!open) setModalClosed(true); }}
            onTaskUpdated={(updated) => setState({ status: 'private_interactive', task: updated })}
            onTaskDeleted={() => setModalClosed(true)}
            users={users}
          />
        )}
      </div>
    );
  }

  // Public, read-only view
  const task = state.task;
  const sConfig = TASK_STATUS_CONFIG[task.status];
  const pConfig = TASK_PRIORITY_CONFIG[task.priority];
  const SIcon = sConfig.icon;

  return (
    <div className={bg}>
      <BackToApp />
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn('text-xs gap-1', sConfig.bgColorClass, sConfig.colorClass)}>
                <SIcon className="h-3 w-3" /> {sConfig.label}
              </Badge>
              <Badge variant="outline" className={cn('text-xs gap-1', pConfig.colorClass)}>
                <span className={cn('w-2 h-2 rounded-full', pConfig.dotColor)} /> Prioridad {pConfig.label}
              </Badge>
              {task.client && <span className="text-xs text-muted-foreground">{task.client.name}</span>}
            </div>

            <h1 className="text-xl font-bold">{task.title}</h1>

            {task.description ? (
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin descripción</p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {task.due_date && (
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(task.due_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
              {task.assignees?.length > 0 && (
                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {task.assignees.map(a => a.full_name).join(', ')}</span>
              )}
            </div>

            {task.attachments.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-2">
                  <Paperclip className="h-3 w-3" /> Adjuntos
                </p>
                <div className="flex flex-wrap gap-2">
                  {task.attachments.map(att => (
                    <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-muted/30 px-2 py-1 text-xs hover:bg-muted/50 transition-colors">
                      <LinkIcon className="h-3 w-3" /> {att.name || att.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-3">
                <MessageSquare className="h-3 w-3" /> Comentarios ({task.comments.length})
              </p>
              <div className="space-y-3">
                {task.comments.length === 0 && <p className="text-xs text-muted-foreground/60">Sin comentarios</p>}
                {task.comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px] font-bold">{c.user?.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{c.user?.full_name || 'Usuario'}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/60 text-center pt-2 border-t border-border/30">Vista pública de solo lectura</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BackToApp() {
  return (
    <div className="fixed top-4 left-4 z-[60]">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 shadow-md bg-background/80 backdrop-blur"
        onClick={() => { window.location.href = '/dashboard'; }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a la app
      </Button>
    </div>
  );
}

function LoginGate({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Completá email y contraseña'); return; }
    setLoading(true);
    setError('');
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const { error: signInError } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) { setError(signInError.message || 'Credenciales incorrectas'); return; }
      onLoggedIn();
    } catch {
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(bg, 'flex items-center justify-center p-6')}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <h1 className="text-xl font-bold">Tarea privada</h1>
          <p className="text-sm text-muted-foreground mt-1">Iniciá sesión con tu cuenta de Merco Digital para ver esta tarea</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">Email</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@mercodigital.com" type="email" className="h-11 rounded-xl" autoFocus />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Contraseña</label>
            <div className="relative">
              <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                type={showPassword ? 'text' : 'password'} className="h-11 rounded-xl pr-10" />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" variant="cta" size="cta" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  );
}
