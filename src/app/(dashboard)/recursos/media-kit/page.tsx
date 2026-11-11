import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Download, Palette, Layers, Type, Check, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const logos = [
  { name: 'Logo para fondo claro', file: '/merco-light-mode.svg', background: 'bg-white', usage: 'La versión que aparece en el menú lateral en modo claro.' },
  { name: 'Logo para fondo oscuro', file: '/merco-dark-mode.svg', background: 'bg-[#0B0D12]', usage: 'La versión que aparece en el menú lateral en modo oscuro.' },
  { name: 'Isotipo', file: '/merco-iso.svg', background: 'bg-white', usage: 'La versión compacta del menú lateral colapsado.' },
];

// Values document the existing :root and .dark tokens in globals.css.
const palette = [
  { name: 'Azul de marca', token: '--brand-blue', light: '#1A73E8', dark: '#1A73E8' },
  { name: 'Celeste de marca', token: '--brand-sky', light: '#8AB4F8', dark: '#8AB4F8' },
  { name: 'Rojo de marca', token: '--brand-red', light: '#EA4335', dark: '#EA4335' },
  { name: 'Fondo', token: '--background', light: '#F1F4F9', dark: '#0B0D12' },
  { name: 'Tarjeta', token: '--card', light: '#FFFFFF', dark: '#151820' },
  { name: 'Texto / acción oscura', token: '--foreground', light: '#111827', dark: '#F1F4F9' },
  { name: 'Acento suave', token: '--accent', light: '#E8F0FE', dark: '#172338' },
  { name: 'Acción principal', token: '--primary', light: '#1A73E8', dark: '#8AB4F8' },
];

export default function MediaKitPage() {
  return (
    <div className="w-full min-w-0 space-y-8 py-6 md:py-10">
      <Link href="/recursos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Centro de recursos</Link>
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-tint-blue px-3 py-1.5 text-xs font-medium text-tint-blue-foreground"><Palette className="size-4" /> Merco / Nexus</span>
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Media Kit / Branding</h1>
        <p className="max-w-2xl text-muted-foreground">Nuestra referencia visual compartida, basada en los archivos y estilos que usa hoy la aplicación.</p>
      </header>
      <div className="rounded-3xl border border-border bg-tint-blue p-6 text-sm leading-relaxed text-tint-blue-foreground md:p-8">
        <p className="mb-2 text-lg font-medium">Merco es la marca. Nexus es la plataforma.</p>
        Los logos conservan su arte original. La paleta y los componentes de esta página documentan la interfaz de Nexus; no reemplazan los colores internos de los SVG ni constituyen un manual corporativo adicional.
      </div>

      <section aria-labelledby="page-shell" className="rounded-[1.6rem] border border-border bg-card p-5 md:p-8">
        <h2 id="page-shell" className="text-2xl font-medium">Márgenes y ancho de página</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">El Centro de Control es la referencia para todas las vistas internas. El layout compartido es el único responsable de los márgenes laterales; las páginas ocupan todo el ancho disponible sin sumar padding horizontal ni un contenedor centrado con ancho máximo.</p>
        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
          <div className="min-w-0 rounded-2xl bg-surface-inset p-4"><h3 className="text-sm font-medium">Layout compartido</h3><code className="mt-2 block break-words text-xs text-muted-foreground">px-4 md:px-8</code><p className="mt-2 text-xs text-muted-foreground">Gutters del main en src/app/(dashboard)/layout.tsx, iguales a los de la barra superior.</p></div>
          <div className="min-w-0 rounded-2xl bg-surface-inset p-4"><h3 className="text-sm font-medium">Contenedor de cada página</h3><code className="mt-2 block break-words text-xs text-muted-foreground">w-full min-w-0 space-y-6</code><p className="mt-2 text-xs text-muted-foreground">Sin px adicional, max-w ni mx-auto exteriores. Los gaps y el padding dentro de las tarjetas conservan su función.</p></div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Excepciones: texto editorial o formularios interiores con ancho de lectura justificado, diálogos, autenticación y páginas públicas. No limitar el ancho de toda una vista para resolver la legibilidad de una sola sección.</p>
      </section>

      <section aria-labelledby="logos" className="space-y-4">
        <h2 id="logos" className="text-2xl font-medium">Logos originales</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {logos.map(logo => (
            <Card key={logo.file} className="rounded-3xl p-5">
              <div className={`flex h-36 items-center justify-center rounded-2xl border border-border p-6 ${logo.background}`}>
                <img src={logo.file} alt={`Merco: ${logo.name}`} className="max-h-12 w-auto max-w-full" />
              </div>
              <h3 className="font-medium">{logo.name}</h3>
              <p className="flex-1 text-sm text-muted-foreground">{logo.usage}</p>
              <Button render={<a href={logo.file} download />} nativeButton={false} variant="outline" className="h-10 rounded-full"><Download /> Descargar SVG</Button>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Mantené las proporciones y el espacio alrededor del logo. Usá estos archivos sin redibujarlos ni recolorearlos.</p>
      </section>

      <section aria-labelledby="palette" className="space-y-4">
        <h2 id="palette" className="text-2xl font-medium">Paleta de la interfaz</h2>
        <p className="text-sm text-muted-foreground">Cada muestra usa el token real y se adapta al tema activo. Los valores claro y oscuro quedan como referencia.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {palette.map(color => (
            <Card key={color.token} className="gap-3 rounded-2xl p-4">
              <div className="h-20 rounded-xl border border-border" style={{ backgroundColor: `var(${color.token})` }} />
              <h3 className="text-sm font-medium">{color.name}</h3>
              <code className="break-all text-xs text-muted-foreground">{color.token}</code>
              <p className="text-xs leading-relaxed text-muted-foreground">Claro: {color.light}<br />Oscuro: {color.dark}</p>
            </Card>
          ))}
        </div>
        <div className="bg-brand-gradient rounded-2xl p-6 text-sm">
          <p className="font-medium">Gradiente de marca</p>
          <code className="mt-2 block break-words text-xs">--brand-gradient: linear-gradient(135deg, #1A73E8 0%, #4285F4 55%, #8AB4F8 100%)</code>
        </div>
      </section>

      <section aria-labelledby="dashboard-cards" className="space-y-4">
        <h2 id="dashboard-cards" className="text-2xl font-medium">Cards del Centro de Control</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">Variantes registradas para reutilizar en la interfaz. Conservan las superficies, radios, recortes y gradientes del dashboard. Todas las cifras y nombres de estas muestras son ejemplos ficticios, no métricas reales. Las acciones están deshabilitadas.</p>
        <div className="grid min-w-0 gap-5 md:grid-cols-2">
          <figure className="min-w-0 space-y-3">
            <div className="relative flex min-h-[340px] flex-col overflow-hidden rounded-[1.6rem] border border-border bg-card p-5">
              <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-10 h-60 w-60 rounded-full opacity-80 blur-[6px] dark:opacity-90" style={{ background: 'radial-gradient(circle at 35% 35%, #AECBFA 0%, #4285F4 38%, #1A73E8 62%, transparent 72%)' }} />
              <div aria-hidden="true" className="pointer-events-none absolute -left-10 bottom-16 h-36 w-36 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #EA4335 0%, transparent 70%)' }} />
              <p className="relative text-[15px] font-medium">Cartera de clientes</p>
              <div className="relative flex-1" />
              <p className="relative text-xs text-muted-foreground">Clientes activos · Ejemplo</p>
              <p className="relative mb-3 mt-0.5 text-6xl font-light leading-none tracking-tight">8</p>
              <div className="relative mb-3 flex h-2.5 gap-[3px] overflow-hidden rounded-full" aria-label="Ejemplo: 8 activos, 3 en onboarding y 1 pausado">
                <div className="rounded-full" style={{ flex: 8, background: 'linear-gradient(90deg, #1A73E8, #8AB4F8)' }} />
                <div className="rounded-full bg-brand-red" style={{ flex: 3 }} />
                <div className="rounded-full bg-track" style={{ flex: 1 }} />
              </div>
              <div className="relative flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-blue" />Activos</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-red" />Onboarding 3</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-track" />Pausados 1</span>
              </div>
              <div className="relative mt-4 flex flex-wrap items-center gap-2.5 rounded-2xl bg-surface-inset py-2.5 pl-4 pr-2.5">
                <span className="flex-1 text-[13px]">Cargá los datos de la semana</span>
                <button type="button" disabled className="bg-brand-gradient h-8 cursor-default rounded-full px-3.5 text-xs font-semibold">Asistente</button>
              </div>
            </div>
            <figcaption className="space-y-1 text-sm"><h3 className="font-medium">Cartera / KPI con esfera</h3><p className="text-muted-foreground">Uso: resumen principal de cartera con distribución y acción auxiliar. Reservar la esfera azul y el halo rojo para esta variante destacada.</p><code className="block text-xs text-muted-foreground">bg-card · rounded-[1.6rem] · bg-surface-inset</code></figcaption>
          </figure>

          <figure className="min-w-0 space-y-3">
            <div className="relative flex min-h-[340px] flex-col rounded-[1.6rem] border border-border bg-card p-5">
              <div className="card-notch"><button type="button" disabled aria-label="Ver clientes: acción de ejemplo deshabilitada" className="flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-border bg-card text-muted-foreground"><ArrowUpRight className="h-3.5 w-3.5" /></button></div>
              <p className="pr-8 text-[15px] font-medium">Clientes por estado</p>
              <p className="mt-3 text-xs text-muted-foreground">Total en la agencia · Ejemplo</p>
              <p className="text-4xl font-light">12</p>
              <div className="flex flex-1 items-end gap-3 pt-4">
                {[
                  { label: 'Activos', n: 8, height: 150, bar: 'bg-gradient-to-b from-brand-sky to-brand-blue', pill: 'bg-foreground text-background' },
                  { label: 'Onboarding', n: 3, height: 56, bar: 'bg-tint-red', pill: 'border border-border bg-card' },
                  { label: 'Pausados', n: 1, height: 22, bar: 'bg-track', pill: 'border border-border bg-card' },
                ].map(bar => (
                  <div key={bar.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${bar.pill}`}>{bar.n}</span>
                    <div className={`w-full rounded-2xl ${bar.bar}`} style={{ height: bar.height }} />
                    <span className="text-xs text-muted-foreground">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <figcaption className="space-y-1 text-sm"><h3 className="font-medium">Estados / Barras con recorte</h3><p className="text-muted-foreground">Uso: comparar cantidades por estado. Mantener cifras visibles, barras redondeadas y flecha circular en la esquina recortada.</p><code className="block text-xs text-muted-foreground">card-notch · bg-track · from-brand-sky to-brand-blue</code></figcaption>
          </figure>

          <figure className="min-w-0 space-y-3">
            <div className="relative flex min-h-[340px] flex-col rounded-[1.6rem] border border-border bg-card p-5">
              <p className="text-[15px] font-medium">Tipos de campaña</p>
              <p className="text-xs text-muted-foreground">Distribución de ejemplo</p>
              <div className="flex flex-1 items-center justify-center py-3">
                <div className="flex h-40 w-40 items-center justify-center rounded-full" style={{ background: 'conic-gradient(var(--brand-blue) 0% 50%, var(--brand-sky) 50% 80%, var(--brand-red) 80% 100%)' }}>
                  <div className="flex h-[6.4rem] w-[6.4rem] flex-col items-center justify-center rounded-full bg-card text-center"><span className="text-3xl font-light">50%</span><span className="text-[11px] text-muted-foreground">Google Ads</span></div>
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                {[{ name: 'Google Ads', n: 5, color: 'var(--brand-blue)' }, { name: 'Meta Ads', n: 3, color: 'var(--brand-sky)' }, { name: 'SEO', n: 2, color: 'var(--brand-red)' }].map(campaign => (
                  <div key={campaign.name} className="min-w-0"><p className="text-xl font-light">{campaign.n}</p><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: campaign.color }} />{campaign.name}</p></div>
                ))}
              </div>
            </div>
            <figcaption className="space-y-1 text-sm"><h3 className="font-medium">Campañas / Donut</h3><p className="text-muted-foreground">Uso: distribución de tipos de campaña. Mostrar el porcentaje dominante al centro y cantidades con leyendas debajo; conservar el orden azul, celeste y rojo.</p><code className="block text-xs text-muted-foreground">conic-gradient · --brand-blue · --brand-sky · --brand-red</code></figcaption>
          </figure>

          <figure className="min-w-0 space-y-3">
            <div className="bg-brand-sky-gradient flex min-h-[340px] flex-col rounded-[1.6rem] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.07em]">Onboarding</p>
              <p className="mt-2 text-xs">Datos de ejemplo</p>
              <div className="flex-1" />
              <p className="text-5xl font-light leading-none">3</p>
              <p className="mb-3 mt-1.5 text-[13px]">clientes configurándose</p>
              <div className="space-y-1.5">{['Cliente ejemplo A', 'Cliente ejemplo B', 'Cliente ejemplo C'].map(name => (
                <div key={name} className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/40 px-3 py-2 text-[13px] font-semibold"><span className="truncate">{name}</span><ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /></div>
              ))}</div>
            </div>
            <figcaption className="space-y-1 text-sm"><h3 className="font-medium">Onboarding / KPI celeste</h3><p className="text-muted-foreground">Uso: destacar clientes en configuración. Superficie celeste continua, sin borde, con KPI grande y hasta tres filas translúcidas.</p><code className="block text-xs text-muted-foreground">bg-brand-sky-gradient · bg-white/40 · rounded-xl</code></figcaption>
          </figure>

          <figure className="min-w-0 space-y-3 md:col-span-2">
            <div className="relative flex flex-col gap-3.5 rounded-[1.5rem] border border-border bg-card p-5">
              <div className="card-notch">
                <button type="button" disabled aria-label="Editar: acción de ejemplo deshabilitada" className="flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-border bg-card text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button type="button" disabled aria-label="Eliminar: acción de ejemplo deshabilitada" className="flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-border bg-card text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                <span aria-hidden="true" className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-full"><ArrowUpRight className="h-3.5 w-3.5" /></span>
              </div>
              <div className="flex items-center gap-3 pt-6 sm:pr-28 sm:pt-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-tint-blue text-sm font-bold text-tint-blue-foreground">CE</div>
                <div className="min-w-0"><p className="truncate text-[15px] font-semibold">Cliente ejemplo</p><p className="truncate text-xs text-muted-foreground">Industria de ejemplo</p></div>
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">Descripción ficticia para mostrar la composición de una tarjeta de cliente. No representa una cuenta real.</p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-tint-blue px-2.5 py-0.5 text-[11px] font-semibold text-tint-blue-foreground">Activo</span>
                {['Google Ads', 'Meta Ads', 'SEO'].map(name => <span key={name} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium">{name}</span>)}
              </div>
            </div>
            <figcaption className="space-y-1 text-sm"><h3 className="font-medium">Cliente / Identidad y acciones recortadas</h3><p className="text-muted-foreground">Uso: acceso a una cuenta de cliente. Avatar o iniciales, descripción breve, estado y hasta tres tipos de campaña. Reservar el recorte superior derecho para editar, eliminar y abrir; en esta muestra no hay acciones reales.</p><code className="block text-xs text-muted-foreground">card-notch · rounded-[1.5rem] · bg-brand-gradient · bg-tint-blue</code></figcaption>
          </figure>
        </div>
        <p className="text-xs text-muted-foreground">Origen: src/app/(dashboard)/dashboard/page.tsx. Recetas visuales registradas para estos usos; los tokens y las utilidades compartidas de globals.css determinan su apariencia en ambos temas.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl p-6 md:p-8">
          <span className="flex size-12 items-center justify-center rounded-full bg-tint-blue text-tint-blue-foreground"><Type className="size-6" /></span>
          <h2 className="text-2xl font-medium">Tipografía</h2>
          <p className="text-4xl font-medium tracking-tight">DM Sans</p>
          <p className="text-sm leading-relaxed text-muted-foreground">Cargada con next/font/google en el layout principal. Pesos disponibles: 400, 500, 600 y 700. El token --font-display alimenta la fuente sans de la aplicación.</p>
          <div className="space-y-3 rounded-2xl bg-muted p-5">
            <p className="text-2xl font-medium tracking-tight">Ideas claras, trabajo en equipo</p>
            <p className="text-sm">Texto de lectura · Regular 400</p>
            <p className="text-sm font-medium">Títulos y etiquetas · Medium 500</p>
            <p className="text-sm font-semibold">Acciones destacadas · Semibold 600</p>
            <p className="text-sm font-bold">Énfasis · Bold 700</p>
          </div>
          <p className="text-xs text-muted-foreground">La fuente monoespaciada declara JetBrains Mono, SFMono-Regular y Consolas como alternativas del sistema; no se descarga una fuente mono adicional.</p>
        </Card>
        <Card className="rounded-3xl p-6 md:p-8">
          <span className="flex size-12 items-center justify-center rounded-full bg-tint-sky text-tint-sky-foreground"><Layers className="size-6" /></span>
          <h2 className="text-2xl font-medium">Componentes en uso</h2>
          <p className="text-sm text-muted-foreground">Ejemplos con los componentes Button y Card existentes. Los enlaces llevan al Centro de recursos.</p>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/recursos" />} nativeButton={false} className="h-10 rounded-full bg-foreground px-4 text-background hover:bg-foreground/90">Acción oscura <ArrowUpRight /></Button>
            <Button render={<Link href="/recursos" />} nativeButton={false} className="h-10 rounded-full px-4">Primario azul</Button>
            <Button render={<Link href="/recursos" />} nativeButton={false} variant="outline" className="h-10 rounded-full px-4">Secundario</Button>
            <Button render={<Link href="/recursos" />} nativeButton={false} variant="cta">CTA de la app</Button>
          </div>
          <Card className="mt-2 p-5">
            <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-tint-teal text-tint-teal-foreground"><Check className="size-5" /></span><p className="font-medium">Tarjeta de referencia</p></div>
            <p className="text-sm text-muted-foreground">Superficie de tarjeta, borde fino e iconos Lucide sobre círculos de tinte suave.</p>
          </Card>
        </Card>
      </div>

      <Card className="rounded-3xl p-6 md:p-8">
        <h2 className="text-2xl font-medium">Criterios de composición</h2>
        <div className="grid gap-6 text-sm leading-relaxed text-muted-foreground md:grid-cols-3">
          <p><strong className="mb-2 block font-medium text-foreground">Espacio para leer</strong>Separaciones de 16, 24 y 32 px nominales (gap-4, gap-6 y gap-8). La escala rem sigue el tamaño raíz de la app: 18 px.</p>
          <p><strong className="mb-2 block font-medium text-foreground">Curvas y bordes</strong>Radio base --radius: 0.875rem. Tarjetas grandes con rounded-2xl / rounded-3xl y acciones redondeadas con rounded-full.</p>
          <p><strong className="mb-2 block font-medium text-foreground">Jerarquía tranquila</strong>Fondos azul grisáceo, superficies claras, títulos de peso medio y acentos azules. En modo oscuro se conservan los tokens y el contraste de la app.</p>
        </div>
      </Card>
      <p className="pb-4 text-xs text-muted-foreground">Fuentes de referencia: public/merco-*.svg, src/app/layout.tsx, src/app/globals.css y src/components/ui. Actualizá este registro junto con futuros cambios de identidad.</p>
    </div>
  );
}
