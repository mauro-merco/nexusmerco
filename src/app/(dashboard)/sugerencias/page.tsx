'use client';

import { useMemo, useState } from 'react';
import { useSuggestions } from '@/lib/hooks/use-suggestions';
import { SuggestionComposeDialog } from '@/components/suggestion-compose-dialog';
import { SuggestionDetailModal } from '@/components/suggestion-detail-modal';
import { SUGGESTION_TYPE_CONFIG, SUGGESTION_STATUS_CONFIG, SUGGESTION_STATUSES } from '@/lib/suggestion-config';
import { cn } from '@/lib/utils';
import { MentionedText } from '@/components/mention';
import type { Suggestion, SuggestionType, SuggestionStatus } from '@/lib/types';
import { Lightbulb, Bug, Plus, Heart, MessageSquare, Loader2, Megaphone } from 'lucide-react';

export default function SuggestionsPage() {
  const {
    suggestions, loading, error, refetch, create, update, remove, toggleLike,
  } = useSuggestions();

  const [typeFilter, setTypeFilter] = useState<SuggestionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'all'>('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<SuggestionType>('suggestion');
  const [selected, setSelected] = useState<Suggestion | null>(null);

  const filtered = useMemo(() => {
    return suggestions.filter(s =>
      (typeFilter === 'all' || s.type === typeFilter) &&
      (statusFilter === 'all' || s.status === statusFilter)
    );
  }, [suggestions, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const byType = (t: SuggestionType) => suggestions.filter(s => s.type === t).length;
    const byStatus = (st: SuggestionStatus) => suggestions.filter(s => s.status === st).length;
    const likes = suggestions.reduce((acc, s) => acc + (s.like_count || 0), 0);
    return {
      total: suggestions.length,
      suggestions: byType('suggestion'),
      bugs: byType('bug'),
      abiertas: byStatus('abierta'),
      en_revision: byStatus('en_revision'),
      implementadas: byStatus('implementada'),
      likes,
    };
  }, [suggestions]);

  const openCompose = (type: SuggestionType) => {
    setDefaultType(type);
    setComposeOpen(true);
  };

  const handleLike = async (s: Suggestion) => {
    try { await toggleLike(s.id); } catch { /* */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-gradient-tech" /> Sugerencias y bugs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Muro del equipo: ideas y reportes para mejorar el producto</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={() => openCompose('suggestion')} className="flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400 transition-colors hover:bg-violet-500/20">
            <Lightbulb className="h-3.5 w-3.5" /> Sugerencia
          </button>
          <button onClick={() => openCompose('bug')} className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/20">
            <Bug className="h-3.5 w-3.5" /> Bug
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total" value={stats.total} icon={<Megaphone className="h-3.5 w-3.5" />} color="text-foreground bg-foreground/5" />
        <Stat label="Sugerencias" value={stats.suggestions} icon={<Lightbulb className="h-3.5 w-3.5" />} color="text-violet-600 dark:text-violet-400 bg-violet-500/10" />
        <Stat label="Bugs reportados" value={stats.bugs} icon={<Bug className="h-3.5 w-3.5" />} color="text-red-600 dark:text-red-400 bg-red-500/10" />
        <Stat label={stats.implementadas === 1 ? 'Implementada' : 'Implementadas'} value={stats.implementadas} icon={<Heart className="h-3.5 w-3.5" />} color="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border bg-card/50 p-0.5">
          {(['all', 'suggestion', 'bug'] as const).map(t => {
            const Icon = t === 'all' ? Megaphone : SUGGESTION_TYPE_CONFIG[t].icon;
            const label = t === 'all' ? 'Todas' : SUGGESTION_TYPE_CONFIG[t].label;
            return (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  typeFilter === t ? 'bg-gradient-tech text-white shadow' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            );
          })}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SuggestionStatus | 'all')}
          className="rounded-lg border border-input bg-background px-2.5 py-2 text-xs text-foreground">
          <option value="all">Todos los estados</option>
          {SUGGESTION_STATUSES.map(st => (
            <option key={st} value={st}>{SUGGESTION_STATUS_CONFIG[st].label}</option>
          ))}
        </select>
        {error && <span className="text-xs text-destructive flex-1 text-right">{error}</span>}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-muted-foreground">
          <Lightbulb className="h-12 w-12 opacity-30" />
          <p className="text-base font-medium">Todavía no hay publicaciones</p>
          <p className="text-sm text-muted-foreground/70 max-w-sm text-center">Sumá una sugerencia o reportá el primer bug para nutrir el muro del equipo.</p>
          <button onClick={() => openCompose('suggestion')} className="mt-1 flex items-center gap-1.5 rounded-full bg-gradient-tech px-4 py-2 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105">
            <Plus className="h-3.5 w-3.5" /> Publicar la primera
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(s => {
            const tCfg = SUGGESTION_TYPE_CONFIG[s.type];
            const sCfg = SUGGESTION_STATUS_CONFIG[s.status];
            const TIcon = tCfg.icon;
            const SIcon = sCfg.icon;
            return (
              <button key={s.id} type="button" onClick={() => setSelected(s)}
                className="group flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5">
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', tCfg.bgColorClass, tCfg.colorClass)}>
                    <TIcon className="h-3 w-3" /> {tCfg.label}
                  </span>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', sCfg.bgColorClass, sCfg.colorClass)}>
                    <SIcon className="h-3 w-3" /> {sCfg.label}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <h3 className="font-semibold leading-snug group-hover:underline decoration-2 underline-offset-2 decoration-primary/40">{s.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap"><MentionedText text={s.content} /></p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    {s.author?.avatar_url ? <img src={s.author.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" /> : null}
                    {s.author?.full_name || 'Usuario'}
                  </span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="inline-flex items-center gap-1" onClick={e => { e.stopPropagation(); handleLike(s); }}>
                      <Heart className={cn('h-3.5 w-3.5', s.liked_by_me && 'fill-primary text-primary')} /> {s.like_count || 0}
                    </span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {s.comment_count || 0}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <SuggestionComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        defaultType={defaultType}
        onSubmit={create}
      />

      {selected && (
        <SuggestionDetailModal
          key={selected.id}
          suggestion={selected}
          open={!!selected}
          onOpenChange={o => { if (!o) setSelected(null); }}
          onUpdated={(s) => {
            setSelected(null);
            refetch();
          }}
          onDeleted={async (id) => { await remove(id); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', color)}>{icon}</span>
      <div>
        <p className="text-lg font-bold leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}