'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskDepartment } from '@/lib/types';
import { DEPARTMENT_CATEGORIES, DEPARTMENT_CONFIG } from '@/lib/department-config';

interface DepartmentPickerProps {
  value: TaskDepartment | null;
  onChange: (dept: TaskDepartment | null) => void;
}

export function DepartmentPicker({ value, onChange }: DepartmentPickerProps) {
  return (
    <div className="space-y-3">
      {Object.entries(DEPARTMENT_CATEGORIES).map(([category, depts]) => (
        <div key={category}>
          <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">{category}</div>
          <div className="flex flex-wrap gap-1.5">
            {depts.map((dept) => {
              const config = DEPARTMENT_CONFIG[dept];
              const Icon = config.icon;
              const isSelected = value === dept;
              return (
                <Badge
                  key={dept}
                  variant="outline"
                  className={cn(
                    'cursor-pointer transition-all px-2.5 py-1 text-xs gap-1.5 border hover:scale-105',
                    isSelected
                      ? `${config.bgColorClass} ${config.textColorClass} border-current shadow-sm`
                      : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  )}
                  onClick={() => onChange(isSelected ? null : dept)}
                >
                  <Icon className="w-3 h-3" />
                  {config.shortLabel}
                </Badge>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
