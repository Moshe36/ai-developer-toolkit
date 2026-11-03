import { useState } from 'react'
import { bulkAssign, patchTask, readErrorMessage } from './api'
import type { Member, Status, Task } from './types'

type Props = {
  tasks: Task[]
  members: Member[]
  setTasks: (tasks: Task[]) => void
  onMutated: () => Promise<void>
}

export function TaskTable({ tasks, members, onMutated }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [selected, setSelected] = useState<number[]>([])
  const [bulkAssignee, setBulkAssignee] = useState<string>('')
  const [editing, setEditing] = useState<Task | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftStatus, setDraftStatus] = useState<Status>('TODO')
  const [draftAssignee, setDraftAssignee] = useState<string>('')
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [drawerError, setDrawerError] = useState<string | null>(null)

  // visible rows (filter + sort)
  let visible = tasks
  if (statusFilter !== '') {
    visible = visible.filter((t) => t.status === statusFilter)
  }
  if (sortBy === 'title') {
    visible = [...visible].sort((a, b) => a.title.localeCompare(b.title))
  } else {
    visible = [...visible].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  // summary numbers (filter logic repeated on purpose-ish: counts per status)
  let todoCount = 0
  let inProgressCount = 0
  let doneCount = 0
  for (const t of tasks) {
    if (statusFilter !== '' && t.status !== statusFilter) continue
    if (t.status === 'TODO') todoCount++
    if (t.status === 'IN_PROGRESS') inProgressCount++
    if (t.status === 'DONE') doneCount++
  }

  // selectable rows for "select all" (filter logic again)
  let selectableIds: number[] = []
  for (const t of tasks) {
    if (statusFilter === '' || t.status === statusFilter) {
      selectableIds.push(t.id)
    }
  }
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id))

  function nameOf(assigneeId: number | null) {
    if (assigneeId === null) return 'Unassigned'
    const member = members.find((m) => m.id === assigneeId)
    return member ? member.name : 'Unassigned'
  }

  return (
    <section>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'center' }}>
        <label>
          Filter by status{' '}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setSelected([])
            }}
          >
            <option value="">All</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
          </select>
        </label>
        <label>
          Sort by{' '}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="createdAt">Created</option>
            <option value="title">Title</option>
          </select>
        </label>
        <span style={{ color: '#666' }}>
          TODO {todoCount} · IN_PROGRESS {inProgressCount} · DONE {doneCount}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          padding: 8,
          background: '#f4f4f4',
          alignItems: 'center',
        }}
      >
        <span>{selected.length} selected</span>
        <label>
          Assign selected to{' '}
          <select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)}>
            <option value="">Choose member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={selected.length === 0 || bulkAssignee === ''}
          onClick={async () => {
            const res = await bulkAssign(selected, Number(bulkAssignee))
            if (!res.ok) {
              setBulkError(await readErrorMessage(res))
              return
            }
            setBulkError(null)
            setSelected([])
            setBulkAssignee('')
            await onMutated()
          }}
        >
          Assign
        </button>
      </div>
      {bulkError && <p role="alert">{bulkError}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected(selectableIds)
                  } else {
                    setSelected([])
                  }
                }}
              />
            </th>
            <th>Title</th>
            <th>Status</th>
            <th>Assignee</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visible.map((task) => (
            <tr key={task.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${task.title}`}
                  checked={selected.includes(task.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected([...selected, task.id])
                    } else {
                      setSelected(selected.filter((id) => id !== task.id))
                    }
                  }}
                />
              </td>
              <td>{task.title}</td>
              <td>{task.status}</td>
              <td>{nameOf(task.assigneeId)}</td>
              <td>
                <button
                  aria-label={`Edit ${task.title}`}
                  onClick={() => {
                    setEditing(task)
                    setDrawerError(null)
                    setDraftTitle(task.title)
                    setDraftStatus(task.status)
                    setDraftAssignee(task.assigneeId === null ? '' : String(task.assigneeId))
                  }}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length === 0 && <p>No tasks match the current filter.</p>}

      {editing && (
        <dialog
          open
          aria-label="Edit task"
          style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 320, padding: 16, boxShadow: '-2px 0 8px #0003' }}
        >
          <h2>Edit task</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <label>
              Title
              <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
            </label>
            <label>
              Status
              <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as Status)}>
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
            </label>
            <label>
              Assignee
              <select value={draftAssignee} onChange={(e) => setDraftAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {drawerError && <p role="alert">{drawerError}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={async () => {
                const id = editing.id
                const res = await patchTask(id, {
                  title: draftTitle,
                  status: draftStatus,
                  assigneeId: draftAssignee === '' ? null : Number(draftAssignee),
                })
                if (!res.ok) {
                  setDrawerError(await readErrorMessage(res))
                  return
                }
                setEditing(null)
                await onMutated()
              }}
            >
              Save
            </button>
            <button onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </dialog>
      )}
    </section>
  )
}
