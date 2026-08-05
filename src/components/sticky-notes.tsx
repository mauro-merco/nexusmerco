'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

const CATEGORY_PRESETS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

interface StickyNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  category: string;
  created_at: string;
  updated_at: string;
}

function getContrastTextColor(bgColor: string): string {
  let r = 0, g = 0, b = 0;
  if (bgColor.length === 7) {
    r = parseInt(bgColor[1] + bgColor[2], 16);
    g = parseInt(bgColor[3] + bgColor[4], 16);
    b = parseInt(bgColor[5] + bgColor[6], 16);
  }
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1e293b' : '#ffffff';
}

function authHeaders() {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function SortableNote({
  note,
  onEdit,
  onDelete,
}: {
  note: StickyNote;
  onEdit: (note: StickyNote) => void;
  onDelete: (id: string) => void;
}) {
  const textColor = getContrastTextColor(note.color);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform?.toString(transform) ?? (transform ? `${transform.x}px, ${transform.y}px` : undefined),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: note.color }}
      {...attributes}
      className={cn(
        'relative rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group',
        isDragging && 'opacity-50'
      )}
      onClick={() => onEdit(note)}
    >
      <div
        {...listeners}
        className="absolute top-1 left-1 cursor-grab rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-black/10"
      >
        <GripVertical className="h-3.5 w-3.5" style={{ color: textColor }} />
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-black/10"
        style={{ color: textColor }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {note.category && (
        <Badge
          className="absolute top-6 left-1 text-xs px-1.5 py-0.5"
          style={{ backgroundColor: note.category, color: getContrastTextColor(note.category) }}
        >
          {note.category}
        </Badge>
      )}

      <div className="mt-5">
        {note.title && (
          <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: textColor }}>
            {note.title}
          </h3>
        )}
        {note.content && (
          <p className="text-xs leading-relaxed line-clamp-3 opacity-80" style={{ color: textColor }}>
            {note.content}
          </p>
        )}
      </div>
    </div>
  );
}

export function StickyNotes({ triggerStartNew, onTriggerNew }: { triggerStartNew?: boolean; onTriggerNew?: () => void }) {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (triggerStartNew) {
      startNew();
      onTriggerNew?.();
    }
  }, [triggerStartNew, onTriggerNew]);

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
        await apiRequest(`/api/sticky-notes/${editingId}`, 'PUT', { title, content, color, category });
      } else {
        await apiRequest('/api/sticky-notes', 'POST', { title, content, color, category });
      }
      resetForm();
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
    setCategory(note.category || '');
    setShowForm(true);
  }

  function startNew() {
    resetForm();
    setShowForm(true);
  }

  function resetForm() {
    setTitle('');
    setContent('');
    setColor(COLORS[0]);
    setCategory('');
    setEditingId(null);
    setShowForm(false);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setNotes((prev) => {
      const oldIndex = prev.findIndex((n) => n.id === active.id);
      const newIndex = prev.findIndex((n) => n.id === over!.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const uncategorizedNotes = notes.filter(n => !n.category);
  const categoriesMap = new Map<string, StickyNote[]>();
  notes.filter(n => n.category).forEach(note => {
    if (!categoriesMap.has(note.category)) categoriesMap.set(note.category, []);
    categoriesMap.get(note.category)!.push(note);
  });
  const categorizedNotes = Array.from(categoriesMap.entries()).map(([category, categoryNotes]) => ({
    category,
    notes: categoryNotes,
  }));

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
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Notas adhesivas</h2>

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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Categoría:</span>
              <Input
                type="text"
                placeholder="Nombre de la categoría..."
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="h-8 rounded-lg text-sm max-w-[150px]"
              />
              {CATEGORY_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'h-5 w-5 rounded border-2 transition-all active:scale-90',
                    category === c ? 'scale-110 border-foreground' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} variant="cta" size="cta" disabled={saving || !title.trim()}>
                {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Crear'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
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

      {uncategorizedNotes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Sin categoría</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={uncategorizedNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {uncategorizedNotes.map(note => (
                  <SortableNote
                    key={note.id}
                    note={note}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {categorizedNotes.map(({ category: cat, notes: catNotes }) => {
        const catColor = cat.startsWith('#') ? cat : '#6366f1';
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: catColor }} />
              <h3 className="text-sm font-medium">{cat.replace(/^#/, '')}</h3>
              <Badge style={{ backgroundColor: catColor, color: getContrastTextColor(catColor) }}>
                {catNotes.length}
              </Badge>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => {
                const { active, over } = e;
                if (!over || active.id === over.id) return;
                const oldIndex = catNotes.findIndex((n) => n.id === active.id);
                const newIndex = catNotes.findIndex((n) => n.id === over.id);
                if (oldIndex !== newIndex) {
                  const newCatNotes = arrayMove(catNotes, oldIndex, newIndex);
                  setNotes(prev => {
                    const newNotes = [...prev];
                    let writeIndex = 0;
                    for (let i = 0; i < newNotes.length; i++) {
                      if (newNotes[i].category === cat) {
                        newNotes[i] = newCatNotes[writeIndex++];
                      }
                    }
                    return newNotes;
                  });
                }
              }}
            >
              <SortableContext items={catNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catNotes.map(note => (
                    <SortableNote
                      key={note.id}
                      note={note}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        );
      })}
    </div>
  );
}
