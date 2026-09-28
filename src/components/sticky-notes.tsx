'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, GripVertical, Tag, Edit3, X, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const NOTE_COLORS = [
  '#fef3c7', '#fee2e2', '#dbeafe', '#dcfce7', '#ede9fe', '#fce7f3', '#d1fae5', '#fbcfe8',
];

const CATEGORY_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
];

interface StickyNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  category: string;
  category_color: string | null;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryInfo {
  name: string;
  color: string;
  count: number;
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform?.toString(transform) ?? (transform ? `${transform.x}px, ${transform.y}px` : undefined),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn('relative cursor-pointer group transition-all duration-200', isDragging && 'opacity-50')}
      onClick={() => onEdit(note)}
    >
      <div className="relative rounded-[1.5rem] p-4 overflow-hidden" style={{ backgroundColor: note.color }}>
        <div
          {...listeners}
          className="absolute top-3 left-3 z-10 cursor-grab rounded-lg p-1 bg-black/10 opacity-0 group-hover:opacity-100 hover:bg-black/15 transition-opacity"
        >
          <GripVertical className="h-3.5 w-3.5" style={{ color: textColor }} />
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          className="absolute top-3 right-3 z-10 cursor-pointer rounded-lg p-1 bg-black/10 opacity-0 group-hover:opacity-100 hover:bg-red-500/30 transition-colors"
          style={{ color: textColor }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        {note.category && note.category_color && (
          <div className="absolute top-10 left-3 z-10">
            <span
              className="text-[10px] font-semibold px-2 py-1 rounded-lg"
              style={{ backgroundColor: note.category_color, color: getContrastTextColor(note.category_color) }}
            >
              {note.category}
            </span>
          </div>
        )}

        <div className={cn('mt-1', note.category && note.category_color ? 'mt-8' : 'mt-1')}>
          {note.is_public && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-md bg-black/10 px-1.5 py-0.5 text-[9px] font-semibold" style={{ color: textColor }}>
              <Globe className="h-2.5 w-2.5" /> Pública
            </span>
          )}
          {note.title && (
            <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: textColor }}>{note.title}</h3>
          )}
          {note.content && (
            <p className="text-xs leading-relaxed line-clamp-3 opacity-80" style={{ color: textColor }}>{note.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function StickyNotes({
  triggerStartNew,
  onTriggerNew,
}: {
  triggerStartNew?: boolean;
  onTriggerNew?: () => void;
}) {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [category, setCategory] = useState('');
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('');

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
      const catMap = new Map<string, { color: string; count: number }>();
      for (const n of json.data || []) {
        if (n.category) {
          if (!catMap.has(n.category)) catMap.set(n.category, { color: n.category_color || '#6366f1', count: 0 });
          catMap.get(n.category)!.count++;
        }
      }
      setCategories(Array.from(catMap.entries()).map(([name, info]) => ({ name, color: info.color, count: info.count })));
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  async function apiRequest(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
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
      const payload = { title, content, color, category: category || '', category_color: category ? categoryColor : null, is_public: isPublic };
      if (editingId) await apiRequest(`/api/sticky-notes/${editingId}`, 'PUT', payload);
      else await apiRequest('/api/sticky-notes', 'POST', payload);
      resetForm();
      await fetchNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiRequest(`/api/sticky-notes/${id}`, 'DELETE');
      await fetchNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  async function handleDeleteCategory(catName: string) {
    try {
      await apiRequest('/api/sticky-notes/categories', 'DELETE', { category: catName });
      await fetchNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar categoría');
    }
  }

  async function handleEditCategory(catName: string) {
    try {
      await apiRequest('/api/sticky-notes/categories', 'PUT', { oldCategory: catName, newCategory: editCategoryName, newColor: editCategoryColor });
      setEditingCategory(null);
      await fetchNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al editar categoría');
    }
  }

  function startEdit(note: StickyNote) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setCategory(note.category || '');
    setCategoryColor(note.category_color || CATEGORY_COLORS[0]);
    setIsPublic(!!note.is_public);
    setShowForm(true);
  }

  function startNew() {
    resetForm();
    setShowForm(true);
  }

  function resetForm() {
    setTitle('');
    setContent('');
    setColor(NOTE_COLORS[0]);
    setCategory('');
    setCategoryColor(CATEGORY_COLORS[0]);
    setIsPublic(false);
    setEditingId(null);
    setShowForm(false);
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setNotes((prev) => {
      const oldIndex = prev.findIndex((n) => n.id === active.id);
      const newIndex = prev.findIndex((n) => n.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const uncategorizedNotes = notes.filter((n) => !n.category);
  const categorizedNotes = categories.map((cat) => ({
    category: cat.name,
    color: cat.color,
    count: cat.count,
    notes: notes.filter((n) => n.category === cat.name),
  }));

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-[1.5rem] bg-muted/40 dark:bg-white/[0.04] animate-pulse" />)}
      </div>
    );
  }

  function CategorySection({ categoryName, categoryColor, catNotes }: { categoryName: string; categoryColor: string; catNotes: StickyNote[] }) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor }} />
          <h3 className="text-sm font-medium text-foreground">{categoryName}</h3>
          <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: categoryColor, color: getContrastTextColor(categoryColor) }}>
            {catNotes.length}
          </span>
          {editingCategory !== categoryName && (
            <>
              <button onClick={() => { setEditingCategory(categoryName); setEditCategoryName(categoryName); setEditCategoryColor(categoryColor); }} className="ml-auto p-1.5 rounded-lg hover:bg-muted/50 dark:hover:bg-white/[0.05] transition-colors">
                <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => handleDeleteCategory(categoryName)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                <X className="h-3.5 w-3.5 text-red-500" />
              </button>
            </>
          )}
        </div>

        {editingCategory === categoryName && (
          <div className="rounded-2xl bg-muted/40 dark:bg-white/[0.04] p-3 space-y-2">
            <Input placeholder="Nombre de la categoría..." value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} className="h-9 rounded-xl text-sm border-0 bg-background/60 dark:bg-white/[0.05]" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">Color:</span>
              {CATEGORY_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setEditCategoryColor(c)} className={cn('h-6 w-6 rounded-lg border-2 transition-all active:scale-90', editCategoryColor === c ? 'border-foreground scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-lg" onClick={handleEditCategory.bind(null, categoryName)} disabled={!editCategoryName.trim()}>
                <Check className="h-3.5 w-3.5 mr-1" /> Guardar
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setEditingCategory(null)}>Cancelar</Button>
            </div>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={catNotes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catNotes.map((note) => <SortableNote key={note.id} note={note} onEdit={startEdit} onDelete={handleDelete} />)}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

      {showForm && (
        <div className="rounded-3xl bg-muted/40 dark:bg-white/[0.04] p-5 space-y-4">
          <Input placeholder="Título..." value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl text-base border-0 bg-background/60 dark:bg-white/[0.05]" autoFocus />
          <Textarea placeholder="Escribí tu nota..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[80px] rounded-xl text-base resize-none border-0 bg-background/60 dark:bg-white/[0.05]" />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Color:</span>
            {NOTE_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn('h-7 w-7 rounded-xl border-2 transition-all active:scale-90', color === c ? 'border-foreground scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Categoría:</span>
              <Input
                type="text"
                placeholder="Nombre de la categoría..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-8 rounded-lg text-sm max-w-[200px] border-0 bg-background/60 dark:bg-white/[0.05]"
                list="category-list"
              />
              <datalist id="category-list">
                {categories.map((c) => <option key={c.name} value={c.name} />)}
              </datalist>
              {category && (
                <div className="flex items-center gap-1">
                  {CATEGORY_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setCategoryColor(c)} className={cn('h-5 w-5 rounded-lg border-2 transition-all active:scale-90', categoryColor === c ? 'scale-110 border-foreground' : 'border-transparent')} style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>
            {category && (
              <span className="inline-flex text-xs font-semibold rounded-full px-2.5 py-1" style={{ backgroundColor: categoryColor, color: getContrastTextColor(categoryColor) }}>
                {category}
              </span>
            )}
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl bg-background/60 dark:bg-white/[0.05] px-3 py-2.5">
            <span className="text-xs font-medium text-foreground">Pública</span>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-primary" />
          </label>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="rounded-xl" disabled={saving || !title.trim()}>
              {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Crear'}
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={resetForm}>Cancelar</Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 rounded-3xl bg-muted/30 dark:bg-white/[0.03]">
          <Plus className="h-8 w-8 opacity-40" />
          <p className="text-sm">No hay notas adhesivas</p>
          <Button onClick={startNew} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Crear la primera
          </Button>
        </div>
      )}

      {uncategorizedNotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <h3 className="text-sm font-medium text-foreground">Sin categoría</h3>
            <span className="text-[10px] font-semibold rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{uncategorizedNotes.length}</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={uncategorizedNotes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {uncategorizedNotes.map((note) => <SortableNote key={note.id} note={note} onEdit={startEdit} onDelete={handleDelete} />)}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {categorizedNotes.map((cat) => (
        <CategorySection key={cat.category} categoryName={cat.category} categoryColor={cat.color} catNotes={cat.notes} />
      ))}
    </div>
  );
}
