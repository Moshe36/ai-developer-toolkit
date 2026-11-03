import { http, HttpResponse } from 'msw'
import { getDb } from './db'
import type { Status, Task } from '../types'

const API = 'http://localhost:8080'
export const OPEN_TASK_LIMIT = 5

const isOpen = (task: Task) => task.status !== 'DONE'

function openCountFor(memberId: number): number {
  return getDb().tasks.filter((t) => t.assigneeId === memberId && isOpen(t)).length
}

function limitReached(memberId: number, addedLoad: number) {
  const current = openCountFor(memberId)
  if (current + addedLoad <= OPEN_TASK_LIMIT) return null
  const member = getDb().members.find((m) => m.id === memberId)!
  return HttpResponse.json(
    {
      code: 'MEMBER_TASK_LIMIT_REACHED',
      message: `${member.name} already has ${current} open tasks (limit ${OPEN_TASK_LIMIT}).`,
      field: 'assigneeId',
    },
    { status: 409 },
  )
}

const error = (status: number, code: string, message: string, field: string | null = null) =>
  HttpResponse.json({ code, message, field }, { status })

const memberExists = (id: number) => getDb().members.some((m) => m.id === id)

export const handlers = [
  http.get(`${API}/members`, () =>
    HttpResponse.json(
      getDb().members.map((m) => ({
        ...m,
        assignedTaskCount: getDb().tasks.filter((t) => t.assigneeId === m.id).length,
        openTaskCount: openCountFor(m.id),
        openTaskLimit: OPEN_TASK_LIMIT,
      })),
    ),
  ),

  http.get(`${API}/tasks`, ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const assigneeId = url.searchParams.get('assigneeId')
    const sort = url.searchParams.get('sort') ?? 'createdAt'
    const page = Number(url.searchParams.get('page') ?? 0)
    const size = Math.min(Number(url.searchParams.get('size') ?? 20), 100)
    let items = getDb().tasks.filter(
      (t) => (!status || t.status === status) && (!assigneeId || t.assigneeId === Number(assigneeId)),
    )
    items = [...items].sort((a, b) =>
      sort === 'title' ? a.title.localeCompare(b.title) : a.createdAt.localeCompare(b.createdAt),
    )
    return HttpResponse.json({ items: items.slice(page * size, (page + 1) * size), total: items.length })
  }),

  http.post(`${API}/tasks`, async ({ request }) => {
    const body = (await request.json()) as { title?: string; assigneeId?: number | null }
    if (!body.title?.trim()) return error(400, 'VALIDATION_FAILED', 'title must not be blank', 'title')
    const assigneeId = body.assigneeId ?? null
    if (assigneeId !== null) {
      if (!memberExists(assigneeId)) return error(404, 'MEMBER_NOT_FOUND', 'Member not found', 'assigneeId')
      const blocked = limitReached(assigneeId, 1)
      if (blocked) return blocked
    }
    const db = getDb()
    const id = Math.max(0, ...db.tasks.map((t) => t.id)) + 1
    const task: Task = { id, title: body.title.trim(), status: 'TODO', assigneeId, createdAt: new Date().toISOString() }
    db.tasks.push(task)
    return HttpResponse.json(task, { status: 201 })
  }),

  http.patch(`${API}/tasks/:id`, async ({ request, params }) => {
    const task = getDb().tasks.find((t) => t.id === Number(params.id))
    if (!task) return error(404, 'TASK_NOT_FOUND', 'Task not found')
    const body = (await request.json()) as { title?: string; status?: Status; assigneeId?: number | null }
    if ('title' in body && !body.title?.trim()) return error(400, 'VALIDATION_FAILED', 'title must not be blank', 'title')
    const newAssignee = 'assigneeId' in body ? (body.assigneeId ?? null) : task.assigneeId
    const newStatus = body.status ?? task.status
    if (newAssignee !== null && !memberExists(newAssignee))
      return error(404, 'MEMBER_NOT_FOUND', 'Member not found', 'assigneeId')
    const addsOpenLoad = newAssignee !== null && newStatus !== 'DONE' && !(isOpen(task) && task.assigneeId === newAssignee)
    if (addsOpenLoad) {
      const blocked = limitReached(newAssignee, 1)
      if (blocked) return blocked
    }
    if ('title' in body) task.title = body.title!.trim()
    task.status = newStatus
    task.assigneeId = newAssignee
    return HttpResponse.json(task)
  }),

  http.post(`${API}/tasks/bulk-assign`, async ({ request }) => {
    const { taskIds, assigneeId } = (await request.json()) as { taskIds: number[]; assigneeId: number }
    if (!memberExists(assigneeId)) return error(404, 'MEMBER_NOT_FOUND', 'Member not found', 'assigneeId')
    const targets = getDb().tasks.filter((t) => taskIds.includes(t.id))
    if (targets.length !== new Set(taskIds).size) return error(404, 'TASK_NOT_FOUND', 'Task not found')
    const addedLoad = targets.filter((t) => isOpen(t) && t.assigneeId !== assigneeId).length
    const blocked = limitReached(assigneeId, addedLoad)
    if (blocked) return blocked
    targets.forEach((t) => (t.assigneeId = assigneeId))
    return HttpResponse.json(targets)
  }),
]

