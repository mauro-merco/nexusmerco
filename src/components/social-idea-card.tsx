'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { SocialIdea, IdeaStatus } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG, RESPONSABLE_CONFIG } from '@/lib/social-config';
import { User, Link as LinkIcon, Check, ChevronDown } from 'lucide-react';

const STATUS_ORDER: IdeaStatus[] = ['borrador', 'en_revision', 'necesita_modificaciones', 'aprobada', 'listo_para_postear', 'posteado'];

interface SocialIdeaCardProps {
  idea: SocialIdea;
  attachments?: { url: string }[];
  onClick: () => void;
  onStatusChange?: (id: string, status: IdeaStatus) => void;
}

export function SocialIdeaCard({ idea, attachments = [], onClick, onStatusChange }: SocialIdeaCardProps) {
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const stConfig = STATUS_CONFIG[idea.status];
  const PtIcon = ptConfig.icon;
  const respCfg = RESPONSABLE_CONFIG[idea.responsable || 'mau'];
  const date = new Date(idea.publish_date + 'T12:00:00');
  const dateStr = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });

  const isPublished = idea.status === 'posteado';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md relative overflow-hidden',
        isPublished
          ? 'border-green-400/50 bg-green-500/10'
          : 'hover:border-primary/20',
      )}
      onClick={onClick}
    >
      {isPublished && (
        <div className="absolute inset-0 backdrop-blur-[2px] z-10" />
      )}
      <CardContent className={cn('p-4', isPublished && 'relative')}>
        {isPublished && (
          <div className="absolute top-3 right-3 z-20">
            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center shadow-md">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          </div>
        )}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className={cn('flex items-center gap-2 min-w-0', isPublished && 'blur-[1px]')}>
            <div className={cn('flex items-center gap-1 rounded-md border px-1.5 py-0.5', ptConfig.bgColorClass, ptConfig.borderColorClass)}>
              <PtIcon className={cn('h-3 w-3 shrink-0', ptConfig.colorClass)} />
              <span className={cn('text-[10px] font-semibold', ptConfig.colorClass)}>{ptConfig.label}</span>
            </div>
            <p className="text-sm font-semibold truncate">{idea.eje_contenido || idea.title}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium shrink-0 transition-colors hover:opacity-80',
                    stConfig.colorClass,
                  )}
                  onClick={(e) => e.stopPropagation()}
                />
              }
            >
              {stConfig.label}
              <ChevronDown className="h-2.5 w-2.5 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuRadioGroup
                value={idea.status}
                onValueChange={(val) => onStatusChange?.(idea.id, val as IdeaStatus)}
              >
                {STATUS_ORDER.map(key => {
                  const s = STATUS_CONFIG[key];
                  return (
                    <DropdownMenuRadioItem key={key} value={key}>
                      <span className={cn('w-2 h-2 rounded-full shrink-0', s.dotColor)} />
                      {s.label}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {idea.copy_text && (
          <p className={cn('text-xs line-clamp-2 mb-2 font-medium', isPublished && 'blur-[1px]', 'text-foreground/90')}>
            {idea.copy_text}
          </p>
        )}
        {idea.brief && (
          <p className={cn('text-xs text-muted-foreground line-clamp-2 mb-2', isPublished && 'blur-[1px]')}>{idea.brief}</p>
        )}
        {!idea.brief && idea.description && (
          <p className={cn('text-xs text-muted-foreground line-clamp-2 mb-2', isPublished && 'blur-[1px]')}>{idea.description}</p>
        )}
        {idea.copy_text && (
          <p className={cn('text-xs line-clamp-2 mb-2 font-medium', isPublished && 'blur-[1px]', 'text-foreground/90')}>
            {idea.copy_text}
          </p>
        )}
        {attachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mb-2', isPublished && 'blur-[1px]')}>
            {attachments.map((att, i) => (
              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 hover:bg-green-500/20 transition-colors max-w-full"
                onClick={(e) => e.stopPropagation()}>
                <LinkIcon className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">Drive</span>
              </a>
            ))}
          </div>
        )}
        <div className={cn('flex items-center justify-between text-[10px] text-muted-foreground', isPublished && 'blur-[1px]')}>
          <span className={cn('flex items-center gap-1', respCfg.colorClass)}>
            <User className="h-3 w-3" /> {respCfg.label}
          </span>
          <span>{dateStr}</span>
        </div>
      </CardContent>
    </Card>
  );
}
