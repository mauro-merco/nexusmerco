/**
 * Script para cargar todos los CSVs de src/csv/multipoint a Supabase
 * Simula el proceso del wizard pero desde archivos locales
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parseCSV } from '../src/lib/csv-parser';
import { config } from 'dotenv';

// Cargar variables de entorno desde .env.local
config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Asegúrate de que .env.local existe y tiene las variables configuradas');
  process.exit(1);
}

async function seedMultipointData() {
  console.log('🚀 Iniciando carga de datos de Multipoint...\n');

  // 1. Inicializar cliente Multipoint
  console.log('📝 Paso 1: Inicializando cliente Multipoint...');
  
  // Usar el endpoint de la app (asegúrate de que el servidor esté corriendo)
  const initAppRes = await fetch('http://localhost:3000/api/clients/init-multipoint', {
    method: 'POST',
  });
  const initData = await initAppRes.json();
  
  if (!initData.data?.id) {
    console.error('❌ Error al inicializar cliente Multipoint');
    return;
  }

  const clientId = initData.data.id;
  console.log(`✅ Cliente Multipoint inicializado: ${clientId}\n`);

  // 2. Leer todos los archivos CSV
  console.log('📂 Paso 2: Leyendo archivos CSV...');
  const basePath = path.join(process.cwd(), 'src', 'csv', 'multipoint');
  const files: Array<{ path: string; name: string; content: string }> = [];

  // Leer archivos de la raíz (Gestión Comercial)
  const rootFiles = await fs.readdir(basePath);
  for (const file of rootFiles) {
    if (file.endsWith('.csv')) {
      const filePath = path.join(basePath, file);
      const content = await fs.readFile(filePath, 'utf-8');
      files.push({ path: filePath, name: file, content });
      console.log(`  📄 ${file}`);
    }
  }

  // Leer subdirectorios
  const subdirs = ['analytics', 'google-ads', 'meta'];
  for (const subdir of subdirs) {
    const subdirPath = path.join(basePath, subdir);
    const subdirExists = await fs.stat(subdirPath).then(() => true).catch(() => false);
    if (!subdirExists) continue;

    const periods = ['mensual', 'semanal'];
    for (const period of periods) {
      const periodPath = path.join(subdirPath, period);
      const periodExists = await fs.stat(periodPath).then(() => true).catch(() => false);
      if (!periodExists) continue;

      // Buscar recursivamente CSVs (pueden estar en subcarpetas por fecha)
      async function findCSVs(dir: string): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const result: string[] = [];
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            result.push(...await findCSVs(full));
          } else if (entry.name.endsWith('.csv')) {
            result.push(full);
          }
        }
        return result;
      }

      const csvFiles = await findCSVs(periodPath);
      for (const filePath of csvFiles) {
        const content = await fs.readFile(filePath, 'utf-8');
        files.push({ path: filePath, name: path.basename(filePath), content });
        console.log(`  📄 ${subdir}/${period}/${path.basename(filePath)}`);
      }
    }
  }

  console.log(`\n✅ ${files.length} archivos encontrados\n`);

  // 3. Procesar y subir cada archivo
  console.log('⬆️  Paso 3: Subiendo archivos a Supabase...\n');
  let successCount = 0;
  let errorCount = 0;

  // Determinar si un archivo es mensual por su carpeta en la ruta
  function isMonthlyFile(filePath: string): boolean {
    return /[/\\\\]mensual[/\\\\]/i.test(filePath);
  }

  for (const file of files) {
    try {
      // Parsear para detectar tipo y extraer fecha
      const parsed = parseCSV(file.content);
      
      // Determinar week_start_date
      let weekStartDate = parsed.dateRange.start || new Date().toISOString().split('T')[0];
      
      // Para archivos de gestión comercial, usar el primer día del mes
      if (parsed.source === 'gc_management' && parsed.meta?.gc?.month) {
        const monthMatch = parsed.meta.gc.month.match(/(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s*(\d{4})/i);
        if (monthMatch) {
          const months: Record<string, string> = {
            ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
            JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12',
          };
          const month = months[monthMatch[1].toUpperCase()];
          const year = monthMatch[2];
          weekStartDate = `${year}-${month}-01`;
        }
      }

      const isMonthlyFile_ = isMonthlyFile(file.path);

      console.log(`  📤 Subiendo: ${file.name}`);
      console.log(`     Tipo: ${parsed.source}`);
      console.log(`     Fecha: ${weekStartDate}`);
      if (isMonthlyFile_) console.log(`     📅 Archivo mensual → week_start=null`);

      // Elegir endpoint según tipo de archivo
      const source = parsed.source;
      let endpoint = '/api/upload-csv';
      if (source.startsWith('google_ads')) {
        endpoint = '/api/upload-google-ads';
      } else if (source.startsWith('meta_ads')) {
        endpoint = '/api/upload-meta-ads';
      } else if (source === 'google_analytics') {
        endpoint = '/api/upload-analytics';
      }

      // Tipos que el nuevo parser NO soporta aún → enviar al endpoint viejo
      const unsupportedNewTypes = ['google_ads_adgroup', 'google_ads_ad'];
      if (unsupportedNewTypes.includes(source) && endpoint !== '/api/upload-csv') {
        endpoint = '/api/upload-csv';
        console.log(`     ⚠️  Tipo no soportado por nuevo parser, usando upload-csv`);
      }

      const body: Record<string, unknown> = {
        client_id: clientId,
        csv_data_raw: file.content,
        filename: file.name,
      };

      if (endpoint === '/api/upload-csv') {
        body.week_start_date = weekStartDate;
      } else {
        // Mensual → week_start = null (solo mes); Semanal → week_start = fecha inicio
        if (!isMonthlyFile_) {
          body.week_start = weekStartDate;
        }
        body.month = weekStartDate.slice(0, 7);
      }

      const uploadRes = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Error al subir');
      }

      console.log(`  ✅ ${file.name} subido exitosamente\n`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error con ${file.name}:`, error instanceof Error ? error.message : error);
      errorCount++;
    }
  }

  // 4. Resumen
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE CARGA');
  console.log('='.repeat(50));
  console.log(`✅ Archivos subidos exitosamente: ${successCount}`);
  console.log(`❌ Archivos con error: ${errorCount}`);
  console.log(`📁 Total de archivos procesados: ${files.length}`);
  console.log('\n🎉 Proceso completado!');
  console.log(`\n🔗 Ver dashboard: http://localhost:3000/clients/${clientId}`);
}

// Ejecutar
seedMultipointData().catch(console.error);
