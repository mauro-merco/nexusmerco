'use client';
import { create } from 'zustand';
import type { TaskClosure } from './task-closure';

export const useTaskClosure = create<{ resolve: ((value: TaskClosure | null) => void) | null }>(() => ({ resolve: null }));

// The server requests closure data only for a new transition, never for legacy edits.
export async function taskMutation(input: string, init: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 422 || (await response.clone().json()).code !== 'task_closure_required') return response;
  if (useTaskClosure.getState().resolve) return Response.json({ error: 'Ya hay un cierre pendiente' }, { status: 409 });
  const closure = await new Promise<TaskClosure | null>(resolve => useTaskClosure.setState({ resolve }));
  if (!closure) return Response.json({ error: 'Cierre cancelado. La tarea no cambió de estado.' }, { status: 409 });
  return fetch(input, { ...init, body: JSON.stringify({ ...JSON.parse(String(init.body)), ...closure }) });
}
