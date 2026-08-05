'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = [
  '#fbbf24',
  '#f87171',
  '#60a5fa',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#2dd4bf',
  '#f472b6',
];

interface StickyNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
}

function authHeaders() {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function StickyNotes() {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/sticky-notes', { headers: authHeaders() });
      if (!res.ok) throw new Error('Error al cargar notas');
      const json = await res.json();
      setNotes(json.data || []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  async function apiRequest(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error');
    }
    return res.json();
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await apiRequest(`/api/sticky-notes/${editingId}`, 'PUT', { title, content, color });
      } else {
        await apiRequest('/api/sticky-notes', 'POST', { title, content, color });
      }
      setTitle('');
      setContent('');
      setColor(COLORS[0]);
      setEditingId(null);
      setShowForm(false);
      await fetchNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiRequest(`/api/sticky-notes/${id}`, 'DELETE');
      await fetchNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  function startEdit(note: StickyNote) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setTitle('');
    setContent('');
    setColor(COLORS[0]);
    setShowForm(true);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Notas adhesivas</h2>
        <Button onClick={startNew} variant="cta" size="cta" className="gap-2">
          <Plus className="h-4 w-4" /> Nueva nota
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {showForm && (
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Título..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-10 rounded-xl text-base"
              autoFocus
            />
            <Textarea
              placeholder="Escribí tu nota..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="min-h-[80px] rounded-xl text-base resize-none"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Color:</span>
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-lg border-2 transition-all active:scale-90',
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} variant="cta" size="cta" disabled={saving || !title.trim()}>
                {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Crear'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {notes.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
          <Plus className="h-8 w-8 opacity-40" />
          <p className="text-sm">No hay notas adhesivas</p>
          <Button onClick={startNew} variant="cta" size="cta" className="gap-2">
            <Plus className="h-4 w-4" /> Crear la primera
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map(note => (
          <div
            key={note.id}
            className="group relative rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
            style={{ backgroundColor: note.color }}
          >
            <button
              type="button"
              onClick={() => handleDelete(note.id)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                {editingId === note.id ? (
                  <div className="space-y-2" onClick={e => e.stopPropagation()}>
                    <Input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="h-9 rounded-lg text-sm"
                      placeholder="Título..."
                      autoFocus
                    />
                    <Textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      className="min-h-[60px] rounded-lg text-sm resize-none"
                      placeholder="Contenido..."
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={cn(
                            'h-5 w-5 rounded border-2 transition-all active:scale-90',
                            color === c ? 'border-foreground scale-110' : 'border-transparent'
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} variant="cta" size="cta" disabled={saving || !title.trim()} className="h-8 text-xs">
                        {saving ? '...' : 'Guardar'}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {note.title && (
                      <h3 className="font-bold text-sm mb-1 line-clamp-1">{note.title}</h3>
                    )}
                    {note.content && (
                      <p className="text-xs leading-relaxed line-clamp-3 opacity-80">{note.content}</p>
                    )}
                  </>
                )}
              </div>
            </div>
            {editingId !== note.id && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startEdit(note); }}
                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground"
              >
                Editar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}