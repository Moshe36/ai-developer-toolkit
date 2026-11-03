import type { Task } from '../types'

export type Seed = { members: { id: number; name: string }[]; tasks: Task[] }

let nextId = 1
const at = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString()
function seedTask(title: string, status: Task['status'], assigneeId: number | null): Task {
  const id = nextId++
  return { id, title, status, assigneeId, createdAt: at(id) }
}

function buildDefaultSeed(): Seed {
  nextId = 1
  return {
    members: [
      { id: 1, name: 'Dana' },
      { id: 2, name: 'Avi' },
      { id: 3, name: 'Noa' },
    ],
    tasks: [
      seedTask('Design login page', 'TODO', 1),
      seedTask('Write API docs', 'TODO', 1),
      seedTask('Fix payment bug', 'IN_PROGRESS', 1),
      seedTask('Review pull requests', 'IN_PROGRESS', 1),
      seedTask('Set up CI', 'DONE', 1),
      seedTask('Create database schema', 'DONE', 1),
      seedTask('Plan sprint', 'TODO', 2),
      seedTask('Update dependencies', 'TODO', 2),
      seedTask('Refactor auth module', 'IN_PROGRESS', 2),
      seedTask('Add dark mode', 'TODO', 3),
      seedTask('Improve search', 'IN_PROGRESS', 3),
      seedTask('Write release notes', 'TODO', null),
      seedTask('Triage bug reports', 'TODO', null),
      seedTask('Update onboarding guide', 'TODO', null),
    ],
  }
}

export const defaultSeed: Seed = buildDefaultSeed()

let state: Seed = structuredClone(defaultSeed)

export function resetDb(seed: Seed = defaultSeed): void {
  state = structuredClone(seed)
}

export function getDb(): Seed {
  return state
}
