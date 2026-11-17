import type { Task, TaskInput, TaskPage, TaskStats } from '@/types/task';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    throw new Error('Could not reach the API. Check that the backend is running.');
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message;
    throw new Error(message || `Request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getTasks(params: URLSearchParams) {
  return request<TaskPage>(`/tasks?${params.toString()}`);
}

export function getStats() {
  return request<TaskStats>('/tasks/stats');
}

export function getTask(id: string) {
  return request<Task>(`/tasks/${encodeURIComponent(id)}`);
}

export function createTask(input: TaskInput) {
  return request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTask(id: string, input: TaskInput) {
  return request<Task>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteTask(id: string) {
  return request<void>(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
