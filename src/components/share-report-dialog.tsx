'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { updateClient } from '@/lib/hooks/use-clients';
import { Globe, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  initialEnabled: boolean;
  initialDescription: string;
  onUpdate: () => void;
}

export function ShareReportDialog({
  open, onOpenChange, clientId, clientName,
  initialEnabled, initialDescription, onUpdate,
}: ShareReportDialogProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/public/${clientId}`;

  useEffect(() => {
    setEnabled(initialEnabled);
    setDescription(initialDescription);
  }, [initialEnabled, initialDescription, open]);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    setSaving(true);
    try {
      await updateClient(clientId, { public_enabled: checked });
      onUpdate();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDescriptionSave = async () => {
    setSaving(true);
    try {
      await updateClient(clientId, { public_description: description });
      onUpdate();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Compartir Reporte
          </DialogTitle>
          <DialogDescription>
            Generá un link público para que {clientName} pueda ver su reporte de marketing digital.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Toggle */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="public-enabled"
              checked={enabled}
              onCheckedChange={(c) => handleToggle(c === true)}
              disabled={saving}
            />
            <div className="flex-1 space-y-1">
              <Label htmlFor="public-enabled" className="text-sm font-medium cursor-pointer">
                Habilitar reporte público
              </Label>
              <p className="text-xs text-muted-foreground">
                Al activar esto, cualquier persona con el link podrá ver el reporte sin necesidad de iniciar sesión.
              </p>
            </div>
          </div>

          {/* Public link */}
          {enabled && (
            <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border/40">
              <Label className="text-xs font-medium">Link público</Label>
              <div className="flex items-center gap-2">
                <Input value={publicUrl} readOnly className="text-xs font-mono" />
                <Button size="icon" variant="outline" className="shrink-0" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="outline" className="shrink-0" onClick={() => window.open(publicUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="public-desc" className="text-xs font-medium">
                  Descripción para el reporte <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="public-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: Reporte mensual de marketing"
                    className="text-xs"
                  />
                  <Button size="sm" variant="secondary" onClick={handleDescriptionSave} disabled={saving} className="shrink-0">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
