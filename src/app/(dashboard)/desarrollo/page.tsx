'use client';

import { useAuthStore } from '@/store/auth-store';
import { DevelopmentLogPanel } from '@/components/development-log-panel';
import { NoAccess } from '@/components/no-access';
import { hasModuleAccess } from '@/lib/permissions';
import { FileCode } from 'lucide-react';

export default function DevelopmentPage() {
  const { user } = useAuthStore();

  if (!hasModuleAccess(user, 'desarrollo')) {
    return <NoAccess message="No tienes permiso para acceder al reporte diario." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileCode className="h-6 w-6 text-gradient-tech" /> Reporte diario
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Registro de desarrollo y pasos importantes de la app</p>
      </div>
      <DevelopmentLogPanel />
    </div>
  );
}
