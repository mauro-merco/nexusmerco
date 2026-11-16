'use client';
// TEMPORAL: solo para revisar visualmente la vista de edición sin sesión. Se borra al terminar.
import EditClientPage from '@/app/(dashboard)/clients/[id]/edit/page';

if (typeof window !== 'undefined') {
  const real = window.fetch;
  window.fetch = async (input, init) => {
    const url = String(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.includes('/api/clients/')) {
      return new Response(JSON.stringify({ data: {
        id: 'demo', name: 'Casa Raiz', logo_url: '', description: '', industry: 'Hogar y deco',
        campaign_types: ['google_ads', 'meta_ads'], plan: 'pro', status: 'active',
        analysis_enabled: false, social_calendar_enabled: false, ads_calendar_enabled: true,
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return real(input, init);
  };
}

export default function Preview() {
  return (
    <main className="min-h-dvh bg-background px-4 pt-2 pb-8 md:px-8">
      <EditClientPage />
    </main>
  );
}
