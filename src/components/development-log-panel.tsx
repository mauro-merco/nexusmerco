'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, GitCommit, FileCode, Bug, Wrench, FileText, Sparkles, TestTube, Package, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DevLogEntry } from '@/app/api/development-log/route';

const CATEGORY_CONFIG = {
  feature: { label: 'Nueva Función', icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  fix: { label: 'Corrección', icon: Bug, color: 'text-red-500', bg: 'bg-red-500/10' },
  refactor: { label: 'Refactor', icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  docs: { label: 'Documentación', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  style: { label: 'Estilo', icon: Sparkles, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  test: { label: 'Testing', icon: TestTube, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  chore: { label: 'Mantenimiento', icon: Package, color: 'text-gray-500', bg: 'bg-gray-500/10' },
} as const;

export function DevelopmentLogPanel() {
  const [logs, setLogs] = useState<DevLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [deployedFilter, setDeployedFilter] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (categoryFilter) params.set('category', categoryFilter);
      if (deployedFilter) params.set('deployed', deployedFilter);

      const token = localStorage.getItem('nexus-auth');
      const authToken = token ? JSON.parse(token).state?.token : null;

      const res = await fetch(`/api/development-log?${params.toString()}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });

      const json = await res.json();
      if (res.ok) {
        setLogs(json.data || []);
      }
    } catch (error) {
      console.error('Error fetching dev logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [days, categoryFilter, deployedFilter]);

  const groupedByDate = logs.reduce((acc, log) => {
    const date = format(new Date(log.created_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, DevLogEntry[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-gradient-tech">Reporte de Desarrollo</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Registro de commits, implementaciones y cambios de código
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="7">7 días</option>
              <option value="14">14 días</option>
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
            </select>

            <select
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">Todas las categorías</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>

            <select
              value={deployedFilter || ''}
              onChange={(e) => setDeployedFilter(e.target.value || null)}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              <option value="true">Desplegado</option>
              <option value="false">Pendiente</option>
            </select>

            <Button size="sm" variant="outline" onClick={fetchLogs} className="gap-2">
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay entradas de desarrollo en este periodo</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-gradient-tech opacity-20" />
                  <time className="text-sm font-semibold text-muted-foreground">
                    {format(new Date(date), "EEEE d 'de' MMMM", { locale: es })}
                  </time>
                  <div className="h-px flex-1 bg-gradient-tech opacity-20" />
                </div>

                <div className="space-y-3">
                  {groupedByDate[date].map((log) => {
                    const cfg = CATEGORY_CONFIG[log.category as keyof typeof CATEGORY_CONFIG];
                    const Icon = cfg.icon;

                    return (
                      <div
                        key={log.id}
                        className="group relative rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cfg.bg)}>
                            <Icon className={cn('h-5 w-5', cfg.color)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-semibold text-foreground">{log.title}</h4>
                              <Badge variant="outline" className={cn('text-xs', cfg.color)}>
                                {cfg.label}
                              </Badge>
                              {log.deployed ? (
                                <Badge variant="outline" className="text-xs text-emerald-500 gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Desplegado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-orange-500 gap-1">
                                  <Clock className="h-3 w-3" /> Pendiente
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
                              {log.description}
                            </p>

                            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                              {log.commit_hash && (
                                <span className="flex items-center gap-1.5">
                                  <GitCommit className="h-3 w-3" />
                                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                                    {log.commit_hash.substring(0, 7)}
                                  </code>
                                </span>
                              )}

                              {log.author_name && (
                                <span className="flex items-center gap-1.5">
                                  <Avatar className="h-4 w-4">
                                    {log.author_avatar && <AvatarImage src={log.author_avatar} />}
                                    <AvatarFallback className="text-[8px]">
                                      {log.author_name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  {log.author_name}
                                </span>
                              )}

                              {log.files_changed && log.files_changed.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileCode className="h-3 w-3" />
                                  {log.files_changed.length} archivo{log.files_changed.length > 1 ? 's' : ''}
                                </span>
                              )}

                              {log.pr_url && (
                                <a
                                  href={log.pr_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Ver PR
                                </a>
                              )}

                              <time>
                                {format(new Date(log.created_at), 'HH:mm')}
                              </time>
                            </div>

                            {log.tags && log.tags.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {log.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {log.files_changed && log.files_changed.length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-primary hover:underline">
                                  Ver archivos modificados ({log.files_changed.length})
                                </summary>
                                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                  {log.files_changed.map((file, i) => (
                                    <li key={i} className="font-mono truncate">· {file}</li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
