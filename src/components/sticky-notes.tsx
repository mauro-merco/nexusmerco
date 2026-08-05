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
import { Plus, Trash2, GripVertical, Tag, Edit3, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const NOTE_COLORS = [
  '#fef3c7', // amarillo claro
  '#fee2e2', // rojo claro
  '#dbeafe', // azul claro
  '#dcfce7', // verde claro
  '#ede9fe', // violeta claro
  '#fce7f3', // rosa claro
  '#d1fae5', // teal claro
  '#fbcfe8', // fucsia claro
];

const CATEGORY_COLORS = [
  '#ef4444', // rojo intenso
  '#f59e0b', // amarillo intenso
  '#10b981', // verde intenso
  '#3b82f6', // azul intenso
  '#8b5cf6', // violeta intenso
  '#ec4899', // rosa intenso
];

interface StickyNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  category: string;
  category_color: string | null;
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style: React.CSSProperties = {
    transform:
      CSS.Transform?.toString(transform) ??
      (transform ? `${transform.x}px, ${transform.y}px` : undefined),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
      }}
      {...attributes}
      className={cn(
        'relative cursor-pointer group transition-all duration-200',
        isDragging && 'opacity-50',
      )}
      onClick={() => onEdit(note)}
    >
      <div
        className={cn(
          'relative rounded-[1.25rem] p-4 overflow-hidden',
          'before:absolute before:inset-0 before:rounded-[1.25rem] before:backdrop-blur-sm',
          'before:bg-white/10 dark:before:bg-black/20',
          'before:border before:border-white/20 dark:before:border-white/5',
          'shadow-lg hover:shadow-xl',
          isDragging && 'opacity-50',
        )}
        style={{
          backgroundColor: note.color,
        }}
      >
        {/* Drag handle */}
        <div
          {...listeners}
          className="absolute top-3 left-3 z-10 cursor-grab rounded-lg p-1 bg-white/20 dark:bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-white/30 dark:hover:bg-black/30 transition-opacity"
        >
          <GripVertical className="h-3.5 w-3.5" style={{ color: textColor }} />
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="absolute top-3 right-3 z-10 cursor-pointer rounded-lg p-1 bg-white/20 dark:bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-red-500/30 transition-colors"
          style={{ color: textColor }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        {/* Category pill */}
        {note.category && note.category_color && (
          <div
            className="absolute top-10 left-3 z-10"
            style={{
              backgroundColor: note.category_color,
              color: getContrastTextColor(note.category_color),
            }}
          >
            <Badge
              variant="secondary"
              className="text-xs px-2 py-1 font-medium rounded-lg shadow-sm"
              style={{
                backgroundColor: note.category_color,
                color: getContrastTextColor(note.category_color),
              }}
            >
              {note.category}
            </Badge>
          </div>
        )}

        {/* Content */}
        <div className={cn('mt-1', note.category && note.category_color ? 'mt-8' : 'mt-1')}>
          {note.title && (
            <h3
              className="font-bold text-sm mb-1 line-clamp-2 drop-shadow-sm"
              style={{ color: textColor }}
            >
              {note.title}
            </h3>
          )}
          {note.content && (
            <p
              className="text-xs leading-relaxed line-clamp-3 opacity-80 drop-shadow-sm"
              style={{ color: textColor }}
            >
              {note.content}
            </p>
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
      // Derive categories from notes
      const catMap = new Map<string, { color: string; count: number }>();
      for (const n of json.data || []) {
        if (n.category) {
          if (!catMap.has(n.category)) {
            catMap.set(n.category, { color: n.category_color || '#6366f1', count: 0 });
          }
          catMap.get(n.category)!.count++;
        }
      }
      setCategories(
        Array.from(catMap.entries()).map(([name, info]) => ({
          name,
          color: info.color,
          count: info.count,
        })),
      );
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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
        await apiRequest(`/api/sticky-notes/${editingId}`, 'PUT', {
          title,
          content,
          color,
          category: category || '',
          category_color: category ? categoryColor : null,
        });
      } else {
        await apiRequest('/api/sticky-notes', 'POST', {
          title,
          content,
          color,
          category: category || '',
          category_color: category ? categoryColor : null,
        });
      }
      resetForm();
      await fetchNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
      console.error(e);
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
      console.error(e);
    }
  }

  async function handleDeleteCategory(catName: string) {
    try {
      await apiRequest('/api/sticky-notes/categories', 'DELETE', { category: catName });
      await fetchNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar categoría');
      console.error(e);
    }
  }

  async function handleEditCategory(catName: string) {
    try {
      await apiRequest('/api/sticky-notes/categories', 'PUT', {
        oldCategory: catName,
        newCategory: editCategoryName,
        newColor: editCategoryColor,
      });
      setEditingCategory(null);
      await fetchNotes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al editar categoría');
      console.error(e);
    }
  }

  function startEdit(note: StickyNote) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setCategory(note.category || '');
    setCategoryColor(note.category_color || CATEGORY_COLORS[0]);
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

  const groupNotesByCategory = (catNotes: StickyNote[]): StickyNote[] => {
    return catNotes;
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-[1.25rem] bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  function CategorySection({
    categoryName,
    categoryColor,
    catNotes,
  }: {
    categoryName: string;
    categoryColor: string;
    catNotes: StickyNote[];
  }) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: categoryColor }}
          />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {categoryName}
          </h3>
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: categoryColor,
              color: getContrastTextColor(categoryColor),
            }}
          >
            {catNotes.length}
          </Badge>

          {/* Edit category */}
          {editingCategory !== categoryName && (
            <button
              onClick={() => {
                setEditingCategory(categoryName);
                setEditCategoryName(categoryName);
                setEditCategoryColor(categoryColor);
              }}
              className="ml-auto p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Editar categoría"
            >
              <Edit3 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          {/* Delete category */}
          {editingCategory !== categoryName && (
            <button
              onClick={() => handleDeleteCategory(categoryName)}
              className="p-1 rounded-lg hover:bg-red-500/20 transition-colors"
              title="Eliminar categoría"
            >
              <X className="h-3.5 w-3.5 text-red-500" />
            </button>
          )}
        </div>

        {editingCategory === categoryName && (
          <div className="mb-3 p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 space-y-2">
            <Input
              placeholder="Nombre de la categoría..."
              value={editCategoryName}
              onChange={(e) => setEditCategoryName(e.target.value)}
              className="h-8 rounded-lg text-sm"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">Color:</span>
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditCategoryColor(c)}
                  className={cn(
                    'h-6 w-6 rounded-lg border-2 transition-all active:scale-90',
                    editCategoryColor === c
                      ? 'border-foreground scale-110'
                      : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="cta"
                onClick={handleEditCategory.bind(null, categoryName)}
                disabled={!editCategoryName.trim()}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Guardar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingCategory(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={catNotes.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catNotes.map((note) => (
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
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Notas adhesivas
        </h2>
        <Button
          variant="cta"
          size="cta"
          onClick={startNew}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Nueva nota
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {showForm && (
        <Card className="border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Título..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-xl text-base"
              autoFocus
            />
            <Textarea
              placeholder="Escribí tu nota..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] rounded-xl text-base resize-none"
            />

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Color:</span>
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-7 w-7 rounded-xl border-2 transition-all active:scale-90',
                      color === c
                        ? 'border-foreground scale-110'
                        : 'border-gray-300 dark:border-gray-600',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Categoría:</span>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Nombre de la categoría..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-8 rounded-lg text-sm pr-8 max-w-[200px]"
                    list="category-list"
                  />
                  <datalist id="category-list">
                    {categories.map((c) => (
                      <option key={c.name} value={c.name} />
                    ))}
                  </datalist>
                </div>

                {category && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Color:</span>
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategoryColor(c)}
                        className={cn(
                          'h-5 w-5 rounded-lg border-2 transition-all active:scale-90',
                          categoryColor === c
                            ? 'scale-110 border-foreground'
                            : 'border-transparent',
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {category && (
                <div className="flex items-center gap-2 pl-6">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      backgroundColor: categoryColor,
                      color: getContrastTextColor(categoryColor),
                    }}
                  >
                    {category}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                variant="cta"
                size="cta"
                disabled={saving || !title.trim()}
              >
                {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Crear'}
              </Button>
              <Button variant="outline" size="cta" onClick={resetForm}>
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
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sin categoría
            </h3>
            <Badge variant="secondary" className="text-xs">
              {uncategorizedNotes.length}
            </Badge>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={uncategorizedNotes.map((n) => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {uncategorizedNotes.map((note) => (
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

      {categorizedNotes.map((cat) => (
        <CategorySection
          key={cat.category}
          categoryName={cat.category}
          categoryColor={cat.color}
          catNotes={cat.notes}
        />
      ))}
    </div>
  );
}
