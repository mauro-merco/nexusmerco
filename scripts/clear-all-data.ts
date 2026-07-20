/**
 * Limpia TODOS los datos cargados vía CSV de Supabase
 * Elimina en orden respetando FK constraints
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function clearAll() {
  console.log('🧹 Limpiando todos los datos cargados...\n');

  // Orden: hijos primero, padres después
  const tables = [
    'gc_daily',
    'gc_metrics',
    'uploaded_files',
    'optimizations',
    'ga4_traffic',
    'campaign_metrics',
    'weekly_inputs',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error(`  ❌ Error eliminando ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ ${table} — datos eliminados`);
    }
  }

  console.log('\n✨ Todos los datos CSV fueron eliminados.');
}

clearAll().catch(console.error);
