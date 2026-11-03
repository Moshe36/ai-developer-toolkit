import type { Member, Task } from './types'

export const API_URL = 'http://localhost:8080'

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${API_URL}/tasks?size=100`)
  return (await res.json()).items
}

export async function fetchMembers(): Promise<Member[]> {
  const res = await fetch(`${API_URL}/members`)
  return res.json()
}

export function patchTask(id: number, body: Partial<Pick<Task, 'title' | 'status' | 'assigneeId'>>) {
  return fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function bulkAssign(taskIds: number[], assigneeId: number) {
  return fetch(`${API_URL}/tasks/bulk-assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskIds, assigneeId }),
  })
}

