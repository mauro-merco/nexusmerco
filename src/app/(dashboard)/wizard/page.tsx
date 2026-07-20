'use client';

import { useState } from 'react';
import { WizardForm } from '@/components/wizard-form';
import { FolderUpload } from '@/components/folder-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/lib/use-t';
import { Upload, FolderOpen } from 'lucide-react';

export default function WizardPage() {
  const _ = useT();
  const [tab, setTab] = useState('single');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{_('wizard.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">{_('wizard.subtitle')}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="single" className="gap-2">
            <Upload className="h-4 w-4" /> Archivos individuales
          </TabsTrigger>
          <TabsTrigger value="folder" className="gap-2">
            <FolderOpen className="h-4 w-4" /> Subir carpeta
          </TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="mt-4">
          <WizardForm />
        </TabsContent>
        <TabsContent value="folder" className="mt-4">
          <FolderUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
}
