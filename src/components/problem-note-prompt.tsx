'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ProblemNotePromptProps {
  open: boolean;
  /** Pre-fills the field when editing an existing problem note. */
  initialNote?: string;
  saving?: boolean;
  onCancel: () => void;
  onSave: (note: string) => void;
}

/**
 * Asks for the blocking description before a task is allowed into the
 * `problemas` state (used by the kanban drag & drop).
 */
export function ProblemNotePrompt({ open, initialNote = '', saving, onCancel, onSave }: ProblemNotePromptProps) {
  const [note, setNote] = useState(initialNote);

  useEffect(() => { if (open) setNote(initialNote); }, [open, initialNote]);

  const submit = () => { if (note.trim()) onSave(note.trim()); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" /> ¿Cuál es el problema?
        </DialogTitle>
        <DialogDescription>
          Describí qué está pasando y qué bloquea la tarea antes de moverla a Problemas.
        </DialogDescription>
        <div className="space-y-2">
          <Label htmlFor="problem-note" className="sr-only">Problema</Label>
          <textarea
            id="problem-note"
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
            placeholder="Describí el problema..."
            className="min-h-[100px] w-full resize-none rounded-xl bg-muted/35 px-3 py-2 text-sm outline-none"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-lg" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button className="rounded-lg" onClick={submit} disabled={saving || !note.trim()}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
