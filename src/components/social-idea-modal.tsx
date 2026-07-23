'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSocialAttachments, useSocialComments } from '@/lib/hooks/use-social-ideas';
import { SocialComment } from '@/components/social-comment';
import { useAuthStore } from '@/store/auth-store';
import type { SocialIdea, PostType, IdeaStatus, Responsable } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG, RESPONSABLE_CONFIG } from '@/lib/social-config';
import {
  Loader2, Trash2, Link, Paperclip,
  Edit3, Calendar, User, Check,
} from 'lucide-react';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'historia', label: 'Historia' },
  { value: 'reel', label: 'Reel' },
  { value: 'carrusel', label: 'Carrusel' },
];

const STATUS_FLOW: IdeaStatus[] = ['borrador', 'en_revision', 'necesita_modificaciones', 'aprobada', 'listo_para_postear', 'posteado'];

interface SocialIdeaModalProps {
  idea: SocialIdea;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIdeaUpdated: (idea: SocialIdea) => void;
  onIdeaDeleted: () => void;
}

export function SocialIdeaModal({ idea, open, onOpenChange, onIdeaUpdated, onIdeaDeleted }: SocialIdeaModalProps) {
  const { user } = useAuthStore();
  const { attachments, addAttachment, removeAttachment } = useSocialAttachments(idea.id);
  const { comments, addComment, deleteComment, updateComment } = useSocialComments(idea.id);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [brief, setBrief] = useState(idea.brief || '');
  const [ejeContenido, setEjeContenido] = useState(idea.eje_contenido || '');
  const [responsable, setResponsable] = useState<Responsable>(idea.responsable || 'mau');
  const [postType, setPostType] = useState<PostType>(idea.post_type);
  const [status, setStatus] = useState<IdeaStatus>(idea.status);
  const [publishDate, setPublishDate] = useState(idea.publish_date);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const [newAttachUrl, setNewAttachUrl] = useState('');
  const [addingAttach, setAddingAttach] = useState(false);

  useEffect(() => {
    setTitle(idea.title);
    setDescription(idea.description);
    setBrief(idea.brief || '');
    setEjeContenido(idea.eje_contenido || '');
    setResponsable(idea.responsable || 'mau');
    setPostType(idea.post_type);
    setStatus(idea.status);
    setPublishDate(idea.publish_date);
    setEditing(false);
    setConfirmDelete(false);
    setSaveError(null);
  }, [idea]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/social-ideas/${idea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, brief, eje_contenido: ejeContenido,
          responsable, post_type: postType, status, publish_date: publishDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');
      onIdeaUpdated(json.data);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [idea.id, title, description, brief, ejeContenido, responsable, postType, status, publishDate, onIdeaUpdated]);

  const handleQuickStatusChange = useCallback(async (newStatus: IdeaStatus) => {
    if (newStatus === idea.status) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/social-ideas/${idea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cambiar estado');
      setStatus(newStatus);
      onIdeaUpdated(json.data);
    } catch {
      // silently fail - status will revert on next open
    } finally {
      setChangingStatus(false);
    }
  }, [idea.id, idea.status, onIdeaUpdated]);

  const handleAddAttachment = useCallback(async () => {
    if (!newAttachUrl.trim()) return;
    setAddingAttach(true);
    try {
      await addAttachment({ type: 'link', url: newAttachUrl.trim(), name: '' });
      setNewAttachUrl('');
    } catch { /* */ } finally {
      setAddingAttach(false);
    }
  }, [newAttachUrl, addAttachment]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      const res = await fetch(`/api/social-ideas/${idea.id}`, { method: 'DELETE' });
      if (res.ok) {
        onIdeaDeleted();
        onOpenChange(false);
      }
    } finally {
      setConfirmDelete(false);
    }
  }, [idea.id, confirmDelete, onIdeaDeleted, onOpenChange]);

  const dateStr = new Date(idea.publish_date + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const isPublished = idea.status === 'posteado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 shrink-0 pr-10">
          <div className="flex-1 min-w-0">
            {editing ? (
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-bold" />
            ) : (
              <DialogTitle className="text-lg">{idea.eje_contenido || idea.title}</DialogTitle>
            )}
            <DialogDescription className="flex items-center gap-2 mt-1 flex-wrap">
              <Calendar className="h-3 w-3" /> {dateStr}
              {(() => {
                const cfg = POST_TYPE_CONFIG[idea.post_type];
                const Icon = cfg.icon;
                return (
                  <Badge variant="outline" className={cn('text-[10px] gap-1', cfg.bgColorClass, cfg.borderColorClass, cfg.colorClass)}>
                    <Icon className="h-2.5 w-2.5" /> {cfg.label}
                  </Badge>
                );
              })()}
              {(() => {
                const cfg = RESPONSABLE_CONFIG[idea.responsable || 'mau'];
                return (
                  <Badge variant="outline" className={cn('text-[10px] gap-1', cfg.colorClass)}>
                    <User className="h-2.5 w-2.5" /> {cfg.label}
                  </Badge>
                );
              })()}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!editing ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setSaveError(null); setTitle(idea.title); setDescription(idea.description); setBrief(idea.brief || ''); setEjeContenido(idea.eje_contenido || ''); setResponsable(idea.responsable || 'mau'); setPostType(idea.post_type); setStatus(idea.status); setPublishDate(idea.publish_date); }}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Guardar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status pills - large, clickable, save immediately */}
        <div className="shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Estado</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FLOW.map(key => {
              const s = STATUS_CONFIG[key];
              const isActive = status === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={changingStatus}
                  onClick={() => handleQuickStatusChange(key)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                    isActive
                      ? [s.colorClass, 'shadow-md ring-1 ring-current/20 scale-[1.02]']
                      : 'border-border/40 text-muted-foreground/60 hover:border-border hover:text-muted-foreground hover:bg-muted/30',
                    changingStatus && 'opacity-50 pointer-events-none',
                  )}
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', s.dotColor)} />
                  {s.label}
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                </button>
              );
            })}
            {changingStatus && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center" />
            )}
          </div>
        </div>

        <Separator />

        {/* Two-column body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* LEFT COLUMN — Detail + Attachments */}
            <div className="md:col-span-3 space-y-4">
              {editing ? (
                <div className="space-y-3">
                  {saveError && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{saveError}</div>
                  )}

                  <div className="space-y-1.5">
                    <Label>Responsable</Label>
                    <div className="flex gap-2">
                      {(['nico', 'mau'] as Responsable[]).map(r => {
                        const cfg = RESPONSABLE_CONFIG[r];
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setResponsable(r)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors font-medium',
                              responsable === r ? cfg.colorClass : 'border-border text-muted-foreground',
                            )}
                          >
                            <User className="h-3 w-3" /> {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Eje de contenido</Label>
                    <Input value={ejeContenido} onChange={(e) => setEjeContenido(e.target.value)} placeholder="Eje de contenido..." />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Brief</Label>
                    <textarea
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px] resize-none"
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                      placeholder="Brief..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Guión / Descripción</Label>
                    <textarea
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[80px] resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Guión o descripción..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <div className="flex gap-2">
                      {POST_TYPES.map(pt => {
                        const cfg = POST_TYPE_CONFIG[pt.value];
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={pt.value}
                            type="button"
                            onClick={() => setPostType(pt.value)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                              postType === pt.value ? cfg.bgColorClass + ' ' + cfg.borderColorClass + ' ' + cfg.colorClass + ' font-medium' : 'border-border text-muted-foreground',
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" /> {pt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Fecha de publicación</Label>
                    <input
                      type="date"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {idea.eje_contenido && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Eje de contenido</p>
                      <p className="text-sm font-medium">{idea.eje_contenido}</p>
                    </div>
                  )}
                  {idea.brief && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Brief</p>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{idea.brief}</p>
                    </div>
                  )}
                  {idea.description && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Guión / Descripción</p>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{idea.description}</p>
                    </div>
                  )}
                  {!idea.eje_contenido && !idea.brief && !idea.description && (
                    <p className="text-sm text-muted-foreground italic">Sin contenido</p>
                  )}
                </div>
              )}

              <Separator />

              {/* Attachments section */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> Adjuntos ({attachments.length})
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Pegá un link de Drive..."
                    value={newAttachUrl}
                    onChange={(e) => setNewAttachUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttachment(); } }}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" onClick={handleAddAttachment} disabled={addingAttach || !newAttachUrl.trim()} className="h-8 shrink-0">
                    {addingAttach ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                  </Button>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map(att => (
                      <div key={att.id}
                        className="flex items-center justify-between gap-2 rounded-lg border p-2 transition-colors hover:bg-muted/50">
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 min-w-0 flex-1">
                          <Link className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="text-xs font-medium truncate underline decoration-dotted underline-offset-2">{att.url}</span>
                        </a>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 shrink-0"
                          onClick={() => removeAttachment(att.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — Comments */}
            <div className="md:col-span-2 flex flex-col min-h-0 rounded-xl bg-muted/30 border border-border/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-2 shrink-0">
                Comentarios ({comments.length})
              </p>
              <div className="flex-1 overflow-y-auto min-h-0">
                <SocialComment
                  ideaId={idea.id}
                  comments={comments}
                  onAddComment={addComment}
                  onDeleteComment={deleteComment}
                  onUpdateComment={updateComment}
                  currentUserId={user?.id}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 border-t pt-3 mt-2">
          <div className="flex items-center justify-between w-full">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">¿Seguro?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> Sí, eliminar
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            )}
            <DialogClose render={<Button variant="outline" />}>Cerrar</DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
