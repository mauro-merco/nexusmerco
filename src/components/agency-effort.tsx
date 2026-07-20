'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgencyEffortProps {
  clientId: string;
  period?: string;
}

interface Optimization {
  id: string;
  platform: string;
  title: string;
  action_taken: string;
  expected_impact: string;
  status: 'completed' | 'in_progress' | 'pending';
  priority: 'high' | 'medium' | 'low';
  created_at: string;
}

export function AgencyEffort({ clientId, period = 'este período' }: AgencyEffortProps) {
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptimizations() {
      try {
        setLoading(true);
        const res = await fetch(`/api/optimizations?client_id=${clientId}`);
        if (!res.ok) throw new Error('Error al cargar optimizaciones');
        const json = await res.json();
        setOptimizations(json.data || []);
      } catch (e) {
        console.error('Error loading optimizations:', e);
        setError('No se pudieron cargar las optimizaciones');
      } finally {
        setLoading(false);
      }
    }
    loadOptimizations();
  }, [clientId]);

  const totalOptimizations = optimizations.length;
  const completed = optimizations.filter(o => o.status === 'completed').length;
  const inProgress = optimizations.filter(o => o.status === 'in_progress').length;
  const completionRate = totalOptimizations > 0 ? (completed / totalOptimizations) * 100 : 0;
  const platformsManaged = [...new Set(optimizations.map(o => o.platform))];

  const priorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-muted-foreground bg-muted/30 border-border/50';
    }
  };

  const keyActions = optimizations.slice(0, 8);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur dark:bg-gray-900/50 dark:border-gray-800/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg text-foreground">Esfuerzo de Agencia</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Trabajo operativo y optimizaciones realizadas {period}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/30">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <AlertCircle className="h-8 w-8 opacity-30" />
            <p className="text-sm">{error}</p>
            <p className="text-xs text-muted-foreground/60">Las optimizaciones se registrarán automáticamente al gestionar campañas</p>
          </div>
        ) : (
          <>
            {/* Effort metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 dark:bg-blue-500/5">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalOptimizations}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Optimizaciones Totales</div>
              </div>

              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 dark:bg-emerald-500/5">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {completed}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Completadas</div>
              </div>

              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 dark:bg-amber-500/5">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {inProgress}
                </div>
                <div className="text-xs text-muted-foreground mt-1">En Progreso</div>
              </div>

              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 dark:bg-purple-500/5">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {totalOptimizations > 0 ? `${completionRate.toFixed(0)}%` : '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Tasa de Completitud</div>
              </div>
            </div>

            {/* Progress bar */}
            {totalOptimizations > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progreso general</span>
                  <span className="font-medium text-foreground">{completionRate.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-muted dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            )}

            {/* Platforms */}
            {platformsManaged.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Plataformas Gestionadas</h4>
                <div className="flex flex-wrap gap-2">
                  {platformsManaged.map((platform) => (
                    <Badge key={platform} variant="outline" className="text-xs dark:border-gray-700">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Key actions */}
            {keyActions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Últimas Acciones</h4>
                <div className="space-y-2">
                  {keyActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-3 rounded-lg border border-border/50 dark:border-gray-800 bg-card/30 dark:bg-gray-900/30 hover:bg-card/50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {action.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : action.status === 'in_progress' ? (
                            <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 dark:border-gray-700">
                              {action.platform}
                            </Badge>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={action.status === 'completed' ? 'default' : action.status === 'in_progress' ? 'secondary' : 'outline'}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {action.status === 'completed' ? 'Completado' : action.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                              </Badge>
                              <div className={cn('text-[10px] px-1.5 py-0.5 rounded border', priorityColor(action.priority))}>
                                {action.priority}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">{action.title}</p>
                          <p className="text-xs text-muted-foreground">
                            <strong>Impacto:</strong> {action.expected_impact || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Value message */}
            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 dark:from-blue-500/5 dark:to-purple-500/5 rounded-lg">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h5 className="font-semibold text-sm text-foreground">El Valor de la Gestión Profesional</h5>
                  <p className="text-xs text-muted-foreground">
                    Detrás de estos números hay trabajo estratégico, análisis continuo y optimización táctica.
                    {totalOptimizations > 0
                      ? ` Se registraron ${totalOptimizations} acciones de optimización (${completed} completadas).`
                      : ' Cada ajuste está diseñado para maximizar tu retorno de inversión.'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
