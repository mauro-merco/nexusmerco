import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseGoogleAds } from '@/lib/parse-google-ads';
import type { GaKeywordRow, GaAssetGroupRow } from '@/lib/parse-google-ads';

function dedupeKeywords(rows: GaKeywordRow[]): GaKeywordRow[] {
  const map = new Map<string, GaKeywordRow>();
  for (const r of rows) {
    const key = `${r.keyword}|${r.match_type}|${r.campaign_name}`;
    const existing = map.get(key);
    if (existing) {
      existing.impressions += r.impressions;
      existing.clicks += r.clicks;
      existing.cost += r.cost;
      existing.conversions += r.conversions;
      existing.conv_value += r.conv_value;
      existing.cpc = existing.clicks > 0 ? existing.cost / existing.clicks : 0;
    } else {
      map.set(key, { ...r });
    }
  }
  return Array.from(map.values());
}

function dedupeAssetGroups(rows: GaAssetGroupRow[]): GaAssetGroupRow[] {
  const map = new Map<string, GaAssetGroupRow>();
  for (const r of rows) {
    const existing = map.get(r.asset_group_name);
    if (existing) {
      existing.impressions += r.impressions;
      existing.clicks += r.clicks;
      existing.cost += r.cost;
      existing.conversions += r.conversions;
      existing.conv_value += r.conv_value;
    } else {
      map.set(r.asset_group_name, { ...r });
    }
  }
  return Array.from(map.values());
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    const parsed = parseGoogleAds(csv_data_raw);
    if (parsed.reportType === 'unknown') {
      return NextResponse.json({ error: 'No se pudo detectar el tipo de reporte de Google Ads' }, { status: 400 });
    }

    const effectiveMonth = month || (parsed.dateRange.start ? parsed.dateRange.start.slice(0, 7) : '');
    const ws = week_start || null;

    if (parsed.reportType === 'campaign' && parsed.campaigns.length > 0) {
      const rows = parsed.campaigns.map(c => ({ ...c, client_id, month: effectiveMonth, week_start: ws }));
      if (ws) {
        await supabase.from('ga_campaigns').delete().eq('client_id', client_id).eq('month', effectiveMonth).eq('week_start', ws);
      } else {
        await supabase.from('ga_campaigns').delete().eq('client_id', client_id).eq('month', effectiveMonth).is('week_start', null);
      }
      const { error } = await supabase.from('ga_campaigns').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (parsed.reportType === 'keyword' && parsed.keywords.length > 0) {
      const deduped = dedupeKeywords(parsed.keywords);
      const rows = deduped.map(k => ({ ...k, client_id, month: effectiveMonth, week_start: ws }));
      if (ws) {
        await supabase.from('ga_search_keywords').delete().eq('client_id', client_id).eq('month', effectiveMonth).eq('week_start', ws);
      } else {
        await supabase.from('ga_search_keywords').delete().eq('client_id', client_id).eq('month', effectiveMonth).is('week_start', null);
      }
      const { error } = await supabase.from('ga_search_keywords').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (parsed.reportType === 'asset_group' && parsed.assetGroups.length > 0) {
      const deduped = dedupeAssetGroups(parsed.assetGroups);
      const rows = deduped.map(a => ({ ...a, client_id, month: effectiveMonth, week_start: ws }));
      if (ws) {
        await supabase.from('ga_asset_groups').delete().eq('client_id', client_id).eq('month', effectiveMonth).eq('week_start', ws);
      } else {
        await supabase.from('ga_asset_groups').delete().eq('client_id', client_id).eq('month', effectiveMonth).is('week_start', null);
      }
      const { error } = await supabase.from('ga_asset_groups').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reportType: parsed.reportType,
      count: parsed.campaigns.length || parsed.keywords.length || parsed.assetGroups.length,
    });
  } catch (err) {
    console.error('upload-google-ads error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
