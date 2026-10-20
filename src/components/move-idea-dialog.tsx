'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EcommerceDate } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MoveIdeaDialogProps {
  ideaId: string;
  ideaTitle: string;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function MoveIdeaDialog({ ideaId, ideaTitle, clientId, onClose, onSuccess }: MoveIdeaDialogProps) {
  const [publishDate, setPublishDate] = useState('');
  const [ecommerceDates, setEcommerceDates] = useState<EcommerceDate[]>([]);
  const [selectedEcommerceId, setSelectedEcommerceId] = useState<string | null>(null);
  const [showNewEcommerce, setShowNewEcommerce] = useState(false);
  const [newEcommerceName, setNewEcommerceName] = useState('');
  const [newEcommerceColor, setNewEcommerceColor] = useState('#10b981');
  const [newEcommerceStartDate, setNewEcommerceStartDate] = useState('');
  const [newEcommerceEndDate, setNewEcommerceEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'date' | 'ecommerce'>('date');

  useEffect(() => {
    fetchEcommerceDates();
  }, [clientId]);

  async function fetchEcommerceDates() {
    try {
      const res = await fetch(`/api/ecommerce-dates?clientId=${clientId}`);
      if (res.ok) {
        const json = await res.json();
        setEcommerceDates(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching ecommerce dates:', err);
    }
  }

  async function handleCreateEcommerce() {
    if (!newEcommerceName.trim() || !newEcommerceStartDate || !newEcommerceEndDate) return;

    try {
      const res = await fetch('/api/ecommerce-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          name: newEcommerceName.trim(),
          color: newEcommerceColor,
          start_date: newEcommerceStartDate,
          end_date: newEcommerceEndDate,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setEcommerceDates([...ecommerceDates, json.data]);
        setSelectedEcommerceId(json.data.id);
        setShowNewEcommerce(false);
        setNewEcommerceName('');
        setNewEcommerceColor('#10b981');
        setNewEcommerceStartDate('');
        setNewEcommerceEndDate('');
      }
    } catch (err) {
      console.error('Error creating ecommerce date:', err);
    }
  }

  async function handleMove() {
    if (!publishDate) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/social-ideas/${ideaId}/move-to-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publish_date: publishDate,
          ecommerce_date_id: selectedEcommerceId,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const json = await res.json();
        alert(json.error || 'Error al mover la idea');
      }
    } catch (err) {
      console.error('Error moving idea:', err);
      alert('Error al mover la idea');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md border border-neutral-200 dark:border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-tech">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Mover a ADS
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {ideaTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Step 1: Date */}
          {step === 'date' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Fecha de publicación en ADS
                </label>
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={onClose} variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => setStep('ecommerce')}
                  disabled={!publishDate}
                  className="flex-1 bg-gradient-tech text-white hover:opacity-90"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Ecommerce Date */}
          {step === 'ecommerce' && (
            <div className="space-y-4">
              {!showNewEcommerce ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Vincular a una fecha ecommerce (opcional)
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => setSelectedEcommerceId(null)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          selectedEcommerceId === null
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20'
                            : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="font-medium text-neutral-900 dark:text-white">
                          Sin fecha ecommerce
                        </div>
                        <div className="text-xs text-neutral-500">
                          No vincular a ninguna fecha especial
                        </div>
                      </button>

                      {ecommerceDates.map((date) => (
                        <button
                          key={date.id}
                          onClick={() => setSelectedEcommerceId(date.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                            selectedEcommerceId === date.id
                              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20'
                              : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: date.color }}
                            />
                            <div className="font-medium text-neutral-900 dark:text-white">
                              {date.name}
                            </div>
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {format(new Date(date.start_date), 'd MMM', { locale: es })} -{' '}
                            {format(new Date(date.end_date), 'd MMM yyyy', { locale: es })}
                          </div>
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={() => setShowNewEcommerce(true)}
                      variant="outline"
                      className="w-full mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear nueva fecha ecommerce
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => setStep('date')} variant="outline" className="flex-1">
                      Atrás
                    </Button>
                    <Button
                      onClick={handleMove}
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-tech text-white hover:opacity-90"
                    >
                      {isSubmitting ? 'Moviendo...' : 'Mover a ADS'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={newEcommerceName}
                        onChange={(e) => setNewEcommerceName(e.target.value)}
                        placeholder="Ej: Black Friday 2024"
                        className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Color
                      </label>
                      <input
                        type="color"
                        value={newEcommerceColor}
                        onChange={(e) => setNewEcommerceColor(e.target.value)}
                        className="w-full h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Inicio
                        </label>
                        <input
                          type="date"
                          value={newEcommerceStartDate}
                          onChange={(e) => setNewEcommerceStartDate(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Fin
                        </label>
                        <input
                          type="date"
                          value={newEcommerceEndDate}
                          onChange={(e) => setNewEcommerceEndDate(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => setShowNewEcommerce(false)} variant="outline" className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateEcommerce}
                      disabled={!newEcommerceName.trim() || !newEcommerceStartDate || !newEcommerceEndDate}
                      className="flex-1 bg-gradient-tech text-white hover:opacity-90"
                    >
                      Crear y vincular
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
