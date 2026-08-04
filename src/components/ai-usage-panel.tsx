'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Wallet, MessageSquare, MessagesSquare, CalendarDays, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelUsage {
  model: string;
  provider: string;
  messages: number;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
}

interface UsageOverview {
  messages: number;
  sessions: number;
  days: number;
  totalCost: number;
  avgCostPerDay: number;
  avgTokensPerSession: number;
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
}

interface UsageData {
  available: boolean;
  overview?: UsageOverview;
  models?: ModelUsage[];
}

const fmtUsd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

const fmtInt = (n: number) => n.toLocaleString('es-AR');

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const PERIODS = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: 'all', label: 'Todo' },
] as const;

type Period = (typeof PERIODS)[number]['value'];

export function AiUsagePanel() {
  const { token } = useAuthStore();
  const [period, setPeriod] = useState<Period>('all');
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/usage?days=${period === 'all' ? '' : period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Error al cargar el uso de IA');
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el uso de IA');
    } finally {
      setLoading(false);
    }
  }, [period, token]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const overview = data?.overview;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Consumo del asistente IA (opencode local)</span>
        </div>
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={period === p.value ? 'default' : 'outline'}
              className="h-7 px-3 text-xs"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}

      {!loading && !error && data && !data.available && (
        <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground space-y-2">
          <Sparkles className="h-6 w-6 mx-auto opacity-40" />
          <p>No se encontró la base de datos local de opencode en este servidor.</p>
          <p className="text-xs text-muted-foreground/70">
            Ejecutá <code className="bg-muted px-1 rounded">npm run ai</code> para iniciar el servidor y probá de nuevo.
          </p>
        </div>
      )}

      {!loading && !error && overview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Wallet className="h-4 w-4" />}
              label="Costo total"
              value={fmtUsd(overview.totalCost)}
              sub={overview.days > 0 ? `${fmtUsd(overview.avgCostPerDay)} / día` : undefined}
            />
            <StatCard
              icon={<MessagesSquare className="h-4 w-4" />}
              label="Mensajes IA"
              value={fmtInt(overview.messages)}
            />
            <StatCard
              icon={<MessageSquare className="h-4 w-4" />}
              label="Sesiones"
              value={fmtInt(overview.sessions)}
              sub={overview.sessions > 0 ? `${fmtCompact(overview.avgTokensPerSession)} tok. / sesión` : undefined}
            />
            <StatCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Período"
              value={overview.days > 0 ? `${overview.days} días` : '—'}
              sub={`${fmtCompact(overview.inputTokens + overview.outputTokens)} tokens`}
            />
          </div>

          <div className="rounded-xl border p-4 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Tokens consumidos</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>Entrada <strong>{fmtCompact(overview.inputTokens)}</strong></span>
              <span>Salida <strong>{fmtCompact(overview.outputTokens)}</strong></span>
              <span>Caché lectura <strong>{fmtCompact(overview.cacheRead)}</strong></span>
              <span>Caché escritura <strong>{fmtCompact(overview.cacheWrite)}</strong></span>
            </div>
          </div>

          {data.models && data.models.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Modelo</th>
                    <th className="px-4 py-2.5 font-medium">Proveedor</th>
                    <th className="px-4 py-2.5 font-medium text-right">Mensajes</th>
                    <th className="px-4 py-2.5 font-medium text-right">Tokens</th>
                    <th className="px-4 py-2.5 font-medium text-right">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.map((m) => (
                    <tr key={`${m.provider}/${m.model}`} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">{m.model}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{m.provider || '—'}</td>
                      <td className="px-4 py-2.5 text-right">{fmtInt(m.messages)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {fmtCompact(m.inputTokens + m.outputTokens + m.cacheRead + m.cacheWrite)}
                      </td>
                      <td className={cn('px-4 py-2.5 text-right', m.cost > 0 && 'font-semibold')}>
                        {fmtUsd(m.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted-foreground/80 flex items-start gap-1.5">
            <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Este es el gasto local aproximado registrado por opencode en este equipo. El saldo real de créditos se
              consulta en la consola de{' '}
              <a
                href="https://console.opencode.ai"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                opencode Zen
              </a>
              . El modelo <strong>big-pickle</strong> es gratuito en Zen y no consume créditos.
            </span>
          </p>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xl font-bold leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
