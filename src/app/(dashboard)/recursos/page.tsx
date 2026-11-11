import Link from 'next/link';
import { ArrowUpRight, BookOpen, Mail, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ResourcesPage() {
  return (
    <div className="w-full min-w-0 space-y-8 py-6 md:py-10">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-tint-blue px-3 py-1.5 text-xs font-medium text-tint-blue-foreground"><BookOpen className="size-4" /> Recursos compartidos</span>
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Centro de recursos</h1>
        <p className="max-w-2xl text-muted-foreground">La identidad y los materiales de Merco, en un solo lugar para todo el equipo.</p>
      </header>
      <div className="rounded-3xl border border-border bg-tint-blue p-6 text-tint-blue-foreground md:p-8">
        <p className="text-lg font-medium">Una misma marca en cada detalle</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed">Consultá los logos, colores y componentes que ya usamos en Nexus antes de preparar una nueva pieza.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="justify-between rounded-3xl p-6 md:p-8">
          <div className="space-y-4">
            <span className="flex size-12 items-center justify-center rounded-full bg-tint-blue text-tint-blue-foreground"><Palette className="size-6" /></span>
            <h2 className="text-xl font-medium">Media Kit / Branding</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">El registro visual de Merco y Nexus: archivos originales, paleta, tipografía y ejemplos de la interfaz actual.</p>
          </div>
          <Button render={<Link href="/recursos/media-kit" />} nativeButton={false} className="mt-4 h-10 w-fit rounded-full bg-foreground px-5 text-background hover:bg-foreground/90">Abrir Media Kit <ArrowUpRight /></Button>
        </Card>
        <Card className="justify-between rounded-3xl p-6 md:p-8">
          <div className="space-y-4">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Mail className="size-6" /></span>
            <h2 className="text-xl font-medium">Firmas de correo</h2>
            <p className="text-sm text-muted-foreground">Próximamente</p>
          </div>
          <Button disabled variant="secondary" className="mt-4 h-10 w-fit rounded-full px-5">Próximamente</Button>
        </Card>
      </div>
    </div>
  );
}
