'use client';

import { cn } from '@/lib/utils';
import { TASK_TYPE_CATEGORIES } from '@/lib/task-config';

interface TaskTypePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskTypePicker({ value, onChange }: TaskTypePickerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
      {TASK_TYPE_CATEGORIES.map(cat => {
        const Icon = cat.icon;
        return (
          <div key={cat.id} className="rounded-xl bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', cat.bgColorClass, cat.colorClass)}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className={cn('text-xs font-semibold leading-tight', cat.colorClass)}>{cat.label}</p>
            </div>
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {cat.types.map(t => {
                const isOn = value === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    title={t.description}
                    onClick={() => onChange(isOn ? '' : t.id)}
                    className={cn(
                      'w-full text-left rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
                      isOn ? cn(cat.bgColorClass, cat.colorClass, 'font-semibold') : 'hover:bg-muted/50 text-foreground/80',
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
