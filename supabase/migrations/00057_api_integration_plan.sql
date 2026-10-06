INSERT INTO development_log (
  title,
  description,
  category,
  priority,
  tags,
  deployed,
  created_at
)
VALUES (
  'PLAN CRITICO: Integracion APIs Google Ads, Meta Ads y GA4',
  E'PASO SUPER IMPORTANTE PARA LA APP\n\nObjetivo: reemplazar datos mock/CSV por datos dinamicos desde APIs oficiales.\n\nVamos a conectar:\n- Google Ads API: campanas, keywords, asset groups, gasto, clics, conversiones, ROAS.\n- Meta Marketing API: campanas, ad sets, ads, insights, alcance, gasto, conversiones.\n- GA4 Data API: canales, trafico, sesiones, usuarios, conversiones, embudo y ecommerce.\n\nFases:\n1. Credenciales por cliente y variables de entorno.\n2. Sync Google Ads.\n3. Sync Meta Ads.\n4. Sync GA4.\n5. Reemplazar mock/Excel en dashboard, analisis, insights IA, asistente semanal, canales, embudo y SEO.\n6. Cron diario + alertas automaticas por ROAS, CPC y caida de conversiones.\n\nImpacto: datos reales, comparativas diarias/semanales/mensuales, graficos dinamicos e insights IA con informacion actualizada.',
  'feature',
  'critical',
  ARRAY['api-integration', 'google-ads', 'meta-ads', 'ga4', 'real-data'],
  false,
  NOW()
);
