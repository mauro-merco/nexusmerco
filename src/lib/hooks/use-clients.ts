'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ClientRecord {
  id: string;
  name: string;
  logo_url: string;
  description: string;
  industry: string;
  campaign_types: string[];
  plan: 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'paused' | 'onboarding';
  public_enabled: boolean;
  public_description: string;
  social_calendar_enabled: boolean;
  analysis_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface ClientFormData {
  name: string;
  logo_url?: string;
  description?: string;
  industry?: string;
  campaign_types?: string[];
  plan?: string;
  status?: string;
  public_enabled?: boolean;
  public_description?: string;
  social_calendar_enabled?: boolean;
  analysis_enabled?: boolean;
}

export function useClients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clients');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setClients(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return { clients, loading, error, refetch: fetchClients };
}

export function useClient(id: string | null) {
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setClient(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cliente');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return { client, loading, error, refetch: fetchClient };
}

export async function createClient(data: ClientFormData): Promise<ClientRecord> {
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function updateClient(id: string, data: Partial<ClientFormData>): Promise<ClientRecord> {
  const res = await fetch(`/api/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export async function deleteClient(id: string): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
}
