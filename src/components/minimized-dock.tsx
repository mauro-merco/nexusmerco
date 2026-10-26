'use client';

import { useMinimizedStore } from '@/store/minimized-store';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useSocialIdeas } from '@/lib/hooks/use-social-ideas';
import { useAdsIdeas } from '@/lib/hooks/use-ads-ideas';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { SocialIdeaModal } from '@/components/social-idea-modal';
import { useState } from 'react';
import { X, CheckSquare, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, SocialIdea } from '@/lib/types';

export function MinimizedDock() {
  const { items, restore, remove, minimize } = useMinimizedStore();
  const { tasks, updateTask, deleteTask } = useTasks(null);
  const { ideas: socialIdeas, updateIdea: updateSocialIdea, deleteIdea: deleteSocialIdea } = useSocialIdeas(null, null);
  const { ideas: adsIdeas, updateIdea: updateAdsIdea, deleteIdea: deleteAdsIdea } = useAdsIdeas(null, null);

  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [openIdea, setOpenIdea] = useState<{ idea: SocialIdea; type: 'social' | 'ads' } | null>(null);

  if (items.length === 0 && !openTask && !openIdea) return null;

  const handleRestore = (item: (typeof items)[number]) => {
    if (item.type === 'task') {
      const t = (item as any).task || tasks.find((x) => x.id === item.id);
      if (t) {
        remove(item.id);
        setOpenTask(null);
        setTimeout(() => setOpenTask(JSON.parse(JSON.stringify(t)) as Task), 10);
        return;
      } else {
        remove(item.id);
        return;
      }
    }
    if (item.type === 'idea') {
      const i = (item as any).idea || (item.ideaCalendarType === 'ads' ? adsIdeas : socialIdeas).find((x) => x.id === item.id);
      if (i) {
        remove(item.id);
        setOpenIdea(null);
        setTimeout(() => setOpenIdea({ idea: JSON.parse(JSON.stringify(i)) as SocialIdea, type: item.ideaCalendarType || 'social' }), 10);
        return;
      } else {
        remove(item.id);
        return;
      }
    }
    remove(item.id);
  };

  return (
    <>
      {(items.length > 0) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] hidden md:flex items-center gap-2 rounded-2xl bg-background/95 backdrop-blur border shadow-lg px-2 py-1">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="group flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-muted/60 transition-colors max-w-[220px]"
              title={item.title}
            >
            <div role="button" tabIndex={0} onMouseDown={(e) => { e.preventDefault(); }} onClick={() => handleRestore(item)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRestore(item); } }} className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer">
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', item.type === 'task' ? 'bg-blue-500/15 text-blue-600' : 'bg-pink-500/15 text-pink-600')}>
                {item.type === 'task' ? <CheckSquare className="h-3.5 w-3.5" /> : <Lightbulb className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 text-left">
                <p className="text-xs font-medium truncate">{item.title}</p>
                {item.subtitle && <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); remove(item.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-background"
              title="Cerrar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          ))}
        </div>
      )}

      {openTask && (
        <TaskDetailModal
          key={`task-${openTask.id}`}
          task={openTask}
          open
          onOpenChange={(o) => { if (!o) { const t = openTask; setOpenTask(null); minimize({ id: t.id, type: 'task', title: t.title, subtitle: (t as any).client?.name || undefined, clientId: (t as any).client_id, task: JSON.parse(JSON.stringify(t)) } as any); } }}
          onTaskUpdated={(t: any) => { void updateTask(t.id, t); setOpenTask(JSON.parse(JSON.stringify(t))); }}
          onTaskDeleted={() => { const id = openTask.id; setOpenTask(null); void deleteTask(id); remove(id); }}
          users={[]}
        />
      )}
      {openIdea && (
        <SocialIdeaModal
          key={`idea-${openIdea.idea.id}`}
          idea={openIdea.idea}
          open
          onOpenChange={(o) => { if (!o) { const cur = openIdea; setOpenIdea(null); minimize({ id: cur.idea.id, type: 'idea', title: cur.idea.eje_contenido || cur.idea.title, subtitle: (cur.idea as any).client?.name || undefined, clientId: (cur.idea as any).client_id || null, routeContext: cur.type === 'ads' ? 'ads' : 'social', ideaCalendarType: cur.type, idea: JSON.parse(JSON.stringify(cur.idea)) } as any); } }}
          onIdeaUpdated={(i: any) => {
            if (openIdea.type === 'ads') void updateAdsIdea(i.id, i);
            else void updateSocialIdea(i.id, i);
            setOpenIdea({ idea: JSON.parse(JSON.stringify(i)), type: openIdea.type });
          }}
          onIdeaDeleted={() => {
            const id = openIdea.idea.id;
            if (openIdea.type === 'ads') void deleteAdsIdea(id);
            else void deleteSocialIdea(id);
            setOpenIdea(null);
            remove(id);
          }}
          users={[]}
          calendarType={openIdea.type}
        />
      )}
    </>
  );
}
