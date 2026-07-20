import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseMetaAds } from '@/lib/parse-meta-ads';
import type { MetaAdSetRow, MetaAdRow } from '@/lib/parse-meta-ads';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fillCampaignNames(
  rows: MetaAdSetRow[],
  supabase: any,
  client_id: string,
  month: string,
): Promise<void> {
  const empty = rows.filter(r => !r.campaign_name);
  if (empty.length === 0) return;

  const { data: campaigns } = await supabase
    .from('meta_campaigns')
    .select('campaign_name')
    .eq('client_id', client_id)
    .eq('month', month)
    .not('campaign_name', 'is', null) as { data: { campaign_name: string }[] | null };

  if (!campaigns?.length) return;

  for (const row of empty) {
    const segments = row.ad_set_name.split(/[|–-]/).map(s => s.trim()).filter(Boolean);
    const firstSegment = segments[0];
    if (!firstSegment) continue;
    const firstWords = firstSegment.split(/\s+/).filter(Boolean);

    let best: string | null = null;
    let bestScore = 0;
    for (const c of campaigns) {
      const cn = c.campaign_name.toLowerCase();
      const matched = firstWords.filter(w => cn.includes(w.toLowerCase())).length;
      if (matched > bestScore) { bestScore = matched; best = c.campaign_name; }
    }
    if (best && bestScore >= Math.min(2, firstWords.length)) {
      row.campaign_name = best;
    }
  }
}

async function fillCampaignNamesForAds(
  rows: MetaAdRow[],
  supabase: any,
  client_id: string,
  month: string,
): Promise<void> {
  const empty = rows.filter(r => !r.campaign_name);
  if (empty.length === 0) return;

  // First try from ad_sets table (ad_set_name -> campaign_name)
  const adSetNames = [...new Set(empty.filter(r => r.ad_set_name).map(r => r.ad_set_name))];
  if (adSetNames.length > 0) {
    const { data: adSets } = await supabase
      .from('meta_ad_sets')
      .select('ad_set_name, campaign_name')
      .eq('client_id', client_id)
      .eq('month', month)
      .in('ad_set_name', adSetNames)
      .not('campaign_name', 'is', null) as { data: { ad_set_name: string; campaign_name: string }[] | null };

    if (adSets?.length) {
      const map = new Map(adSets.map(a => [a.ad_set_name, a.campaign_name]));
      for (const row of empty) {
        if (row.ad_set_name && map.has(row.ad_set_name)) {
          row.campaign_name = map.get(row.ad_set_name)!;
        }
      }
    }
  }

  // For remaining, fall back to campaign name matching (same as ad_set matching)
  const stillEmpty = rows.filter(r => !r.campaign_name);
  if (stillEmpty.length === 0) return;

  const { data: campaigns } = await supabase
    .from('meta_campaigns')
    .select('campaign_name')
    .eq('client_id', client_id)
    .eq('month', month)
    .not('campaign_name', 'is', null) as { data: { campaign_name: string }[] | null };

  if (!campaigns?.length) return;

  for (const row of stillEmpty) {
    const segments = row.ad_set_name?.split(/[|–-]/).map(s => s.trim()).filter(Boolean) || [];
    const firstSegment = segments[0];
    if (!firstSegment) continue;
    const firstWords = firstSegment.split(/\s+/).filter(Boolean);

    let best: string | null = null;
    let bestScore = 0;
    for (const c of campaigns) {
      const cn = c.campaign_name.toLowerCase();
      const matched = firstWords.filter(w => cn.includes(w.toLowerCase())).length;
      if (matched > bestScore) { bestScore = matched; best = c.campaign_name; }
    }
    if (best && bestScore >= Math.min(2, firstWords.length)) {
      row.campaign_name = best;
    }
  }
}

function dedupeAdSets(rows: MetaAdSetRow[]): MetaAdSetRow[] {
  const map = new Map<string, MetaAdSetRow>();
  for (const r of rows) {
    const key = `${r.campaign_name}||${r.ad_set_name}`;
    const existing = map.get(key);
    if (existing) {
      existing.spend += r.spend;
      existing.impressions += r.impressions;
      existing.reach += r.reach;
      existing.results += r.results;
    } else {
      map.set(key, { ...r });
    }
  }
  return [...map.values()];
}

function dedupeAds(rows: MetaAdRow[]): MetaAdRow[] {
  const map = new Map<string, MetaAdRow>();
  for (const r of rows) {
    const key = `${r.campaign_name}||${r.ad_name}`;
    const existing = map.get(key);
    if (existing) {
      existing.spend += r.spend;
      existing.impressions += r.impressions;
      existing.reach += r.reach;
      existing.results += r.results;
    } else {
      map.set(key, { ...r });
    }
  }
  return [...map.values()];
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { client_id, month, week_start, csv_data_raw } = body;

    if (!client_id || !csv_data_raw) {
      return NextResponse.json({ error: 'Faltan campos: client_id, csv_data_raw' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const parsed = parseMetaAds(csv_data_raw);
    if (parsed.reportType === 'unknown') {
      return NextResponse.json({ error: 'No se pudo detectar el tipo de reporte de Meta Ads' }, { status: 400 });
    }

    const effectiveMonth = month || (parsed.dateRange.start ? parsed.dateRange.start.slice(0, 7) : '');
    const ws = week_start || null;

    if (parsed.reportType === 'campaign' && parsed.campaigns.length > 0) {
      const rows = parsed.campaigns.map(c => ({ ...c, client_id, month: effectiveMonth, week_start: ws }));
      if (ws) {
        await supabase.from('meta_campaigns').delete().eq('client_id', client_id).eq('month', effectiveMonth).eq('week_start', ws);
      } else {
        await supabase.from('meta_campaigns').delete().eq('client_id', client_id).eq('month', effectiveMonth).is('week_start', null);
      }
      const { error } = await supabase.from('meta_campaigns').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (parsed.reportType === 'ad_set' && parsed.adSets.length > 0) {
      await fillCampaignNames(parsed.adSets, supabase, client_id, effectiveMonth);
      const deduped = dedupeAdSets(parsed.adSets);
      const rows = deduped.map(a => ({ ...a, client_id, month: effectiveMonth, week_start: ws }));
      if (ws) {
        await supabase.from('meta_ad_sets').delete().eq('client_id', client_id).eq('month', effectiveMonth).eq('week_start', ws);
      } else {
        await supabase.from('meta_ad_sets').delete().eq('client_id', client_id).eq('month', effectiveMonth).is('week_start', null);
      }
      const { error } = await supabase.from('meta_ad_sets').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (parsed.reportType === 'ad' && parsed.ads.length > 0) {
      await fillCampaignNamesForAds(parsed.ads, supabase, client_id, effectiveMonth);
      const deduped = dedupeAds(parsed.ads);
      const rows = deduped.map(a => ({ ...a, client_id, month: effectiveMonth, week_start: ws }));
      if (ws) {
        await supabase.from('meta_ads').delete().eq('client_id', client_id).eq('month', effectiveMonth).eq('week_start', ws);
      } else {
        await supabase.from('meta_ads').delete().eq('client_id', client_id).eq('month', effectiveMonth).is('week_start', null);
      }
      const { error } = await supabase.from('meta_ads').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reportType: parsed.reportType,
      count: parsed.campaigns.length || parsed.adSets.length || parsed.ads.length,
    });
  } catch (err) {
    console.error('upload-meta-ads error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
