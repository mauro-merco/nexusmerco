'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSocialAnnotations } from '@/lib/hooks/use-social-ideas';
import { useSocialComments } from '@/lib/hooks/use-social-ideas';
import { useAuthStore } from '@/store/auth-store';
import type { SocialAttachment } from '@/lib/types';
import { MapPin, Send, Loader2, X } from 'lucide-react';

interface SocialAnnotationProps {
  attachment: SocialAttachment;
  ideaId: string;
}

export function SocialAnnotation({ attachment, ideaId }: SocialAnnotationProps) {
  const { user } = useAuthStore();
  const { annotations, addAnnotation } = useSocialAnnotations(attachment.id);
  const { addComment } = useSocialComments(ideaId);
  const imgRef = useRef<HTMLDivElement>(null);
  const [annotating, setAnnotating] = useState(false);
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!annotating || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPos({ x, y });
  }, [annotating]);

  const handleSaveAnnotation = useCallback(async () => {
    if (!pendingPos || !commentText.trim() || !user) return;
    setSaving(true);
    try {
      const comment = await addComment(user.id, commentText.trim());
      if (comment) {
        await addAnnotation(comment.id, pendingPos.x, pendingPos.y);
      }
      setPendingPos(null);
      setCommentText('');
      setAnnotating(false);
    } catch { /* */ } finally {
      setSaving(false);
    }
  }, [pendingPos, commentText, user, addComment, addAnnotation]);

  const annotationsForAttachment = annotations.filter(a => a.attachment_id === attachment.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Vista previa con anotaciones</p>
        <Button
          variant={annotating ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => { setAnnotating(!annotating); setPendingPos(null); setCommentText(''); }}
        >
          <MapPin className="h-3 w-3" />
          {annotating ? 'Anotando...' : 'Anotar'}
        </Button>
      </div>

      {/* Image with annotation pins */}
      <div
        ref={imgRef}
        className={cn(
          'relative rounded-lg overflow-hidden border',
          annotating && 'cursor-crosshair',
        )}
        onClick={handleImageClick}
      >
        {attachment.type === 'image' ? (
          <img
            src={attachment.url}
            alt={attachment.name || 'Adjunto'}
            className="w-full max-h-[400px] object-contain bg-black/5"
            crossOrigin="anonymous"
          />
        ) : attachment.type === 'video' ? (
          <video
            src={attachment.url}
            className="w-full max-h-[400px] object-contain bg-black/5"
            controls
          />
        ) : (
          <div className="flex items-center justify-center py-12 bg-muted/20">
            <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
              {attachment.url}
            </a>
          </div>
        )}

        {/* Existing annotation pins */}
        {annotationsForAttachment.map(ann => (
          <div
            key={ann.id}
            className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold shadow-lg ring-2 ring-white/50 z-10"
            style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
            title={ann.label || 'Anotación'}
          >
            <MapPin className="h-3 w-3" />
          </div>
        ))}

        {/* Pending annotation pin */}
        {pendingPos && (
          <div
            className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold shadow-lg ring-2 ring-white/50 z-20 animate-pulse"
            style={{ left: `${pendingPos.x}%`, top: `${pendingPos.y}%` }}
          />
        )}
      </div>

      {/* Pending annotation comment input */}
      {pendingPos && (
        <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3 border border-primary/20">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <Input
            placeholder="Comentario para esta zona..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAnnotation(); }}
            className="flex-1 h-8 text-xs"
            autoFocus
          />
          <Button size="sm" className="h-8" onClick={handleSaveAnnotation} disabled={saving || !commentText.trim()}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => { setPendingPos(null); setCommentText(''); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
