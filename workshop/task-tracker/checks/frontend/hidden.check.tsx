import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { App } from '../App'
import { getDb, resetDb, type Seed } from '../mocks/db'
import { server } from '../mocks/server'
import type { Task } from '../types'

const LIMIT_MESSAGE = /limit|too many|maximum|max/i
const ROW_SELECTOR = 'tr, [role="row"], li, article'

function buildSeed(): Seed {
  let id = 1
  const tasks: Task[] = []
  const add = (title: string, status: Task['status'], assigneeId: number | null) => {
    const taskId = id++
    tasks.push({ id: taskId, title, status, assigneeId, createdAt: new Date(Date.UTC(2026, 0, 1, 0, taskId)).toISOString() })
  }
  for (let i = 1; i <= 5; i++) add(`Dana open ${i}`, i % 2 ? 'TODO' : 'IN_PROGRESS', 1)
  add('Dana finished', 'DONE', 1)
  for (let i = 1; i <= 3; i++) add(`Avi open ${i}`, 'TODO', 2)
  for (let i = 1; i <= 7; i++) add(`Noa open ${i}`, 'TODO', 3)
  for (let i = 1; i <= 3; i++) add(`Loose ${i}`, 'TODO', null)
  return {
    members: [
      { id: 1, name: 'Dana' },
      { id: 2, name: 'Avi' },
      { id: 3, name: 'Noa' },
    ],
    tasks,
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isVisible(element: HTMLElement) {
  try {
    expect(element).toBeVisible()
    return true
  } catch {
    return false
  }
}

function visibleLimitMessages() {
  return screen.queryAllByText(LIMIT_MESSAGE).filter(isVisible)
}

async function expectLimitMessageVisible() {
  await waitFor(() => expect(visibleLimitMessages().length).toBeGreaterThan(0))
}

function rowOf(title: string): HTMLElement | null {
  for (const element of screen.queryAllByText(title)) {
    const row = element.closest<HTMLElement>(ROW_SELECTOR)
    if (row) return row
  }
  return null
}

async function findRowOf(title: string): Promise<HTMLElement> {
  await waitFor(() => expect(rowOf(title)).not.toBeNull())
  return rowOf(title)!
}

function rowShows(title: string, text: string) {
  const row = rowOf(title)
  return row !== null && within(row).queryAllByText(text).length > 0
}

async function renderApp() {
  resetDb(buildSeed())
  render(<App />)
  await findRowOf('Dana open 1')
}

async function openEditor(title: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Edit ${title}` }))
  return screen.findByRole('dialog', { name: 'Edit task' })
}

async function setTitle(dialog: HTMLElement, title: string) {
  const input = within(dialog).getByLabelText('Title')
  await userEvent.clear(input)
  await userEvent.type(input, title)
}

async function save(dialog: HTMLElement) {
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
}

function optionOf(select: HTMLElement, name: RegExp | string) {
  return within(select).getByRole('option', { name }) as HTMLOptionElement
}

function waitForBulkAssignResponse() {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      server.events.removeListener('response:mocked', onResponse)
      reject(new Error('bulk-assign request was never made'))
    }, 5000)
    const onResponse = ({ request }: { request: Request }) => {
      if (!request.url.endsWith('/tasks/bulk-assign')) return
      clearTimeout(timer)
      server.events.removeListener('response:mocked', onResponse)
      resolve()
    }
    server.events.on('response:mocked', onResponse)
  })
}

function expectRowsMatchStoredAviTasks() {
  const titles = (predicate: (task: Task) => boolean) =>
    getDb().tasks.filter(predicate).map((t) => t.title).sort()
  expect(titles((t) => rowShows(t.title, 'Avi'))).toEqual(titles((t) => t.assigneeId === 2))
}

async function memberItem(name: string) {
  const sidebar = await screen.findByRole('complementary', { name: 'Members' })
  const label = await within(sidebar).findByText(new RegExp(name))
  return label.closest<HTMLElement>('li') ?? label
}

function itemText(item: HTMLElement) {
  return item.textContent ?? ''
}

describe('hidden checks', () => {
  it('check_01 sidebar count excludes DONE tasks', async () => {
    await renderApp()
    const dana = await memberItem('Dana')
    await waitFor(() => expect(itemText(dana)).toMatch(/\b5\b/))
    expect(itemText(dana)).not.toMatch(/\b6\b/)
  })

  it('check_02 reassigning over the limit is rejected visibly', async () => {
    await renderApp()
    const dialog = await openEditor('Avi open 1')
    const assignee = within(dialog).getByLabelText('Assignee')
    const dana = optionOf(assignee, /Dana/)
    if (dana.disabled) {
      expect(LIMIT_MESSAGE.test(dana.textContent ?? '') || visibleLimitMessages().length > 0).toBe(true)
    } else {
      await userEvent.selectOptions(assignee, dana)
      await save(dialog)
      await expectLimitMessageVisible()
    }
    expect(rowShows('Avi open 1', 'Avi')).toBe(true)
    expect(getDb().tasks.find((t) => t.title === 'Avi open 1')!.assigneeId).toBe(2)
  })

  it('check_03 server error message is shown and task is unchanged', async () => {
    await renderApp()
    server.use(
      http.patch('http://localhost:8080/tasks/:id', () =>
        HttpResponse.json({ code: 'SOMETHING_BROKE', message: 'Server says no 4242', field: null }, { status: 409 }),
      ),
    )
    const dialog = await openEditor('Dana open 1')
    await setTitle(dialog, 'Renamed by test')
    await save(dialog)
    expect(await screen.findAllByText(/Server says no 4242/)).not.toHaveLength(0)
    expect(rowShows('Dana open 1', 'Dana')).toBe(true)
    expect(rowOf('Renamed by test')).toBeNull()
  })

  it('check_04 bulk assign failure does not show false success', async () => {
    await renderApp()
    for (const n of [1, 2, 3]) {
      await userEvent.click(await screen.findByRole('checkbox', { name: `Select Loose ${n}` }))
    }
    const select = screen.getByLabelText('Assign selected to')
    const avi = optionOf(select, 'Avi')
    if (!avi.disabled) {
      const bulkResponded = waitForBulkAssignResponse()
      await userEvent.selectOptions(select, avi)
      await userEvent.click(screen.getByRole('button', { name: 'Assign' }))
      await bulkResponded
      await sleep(300)
    }
    await waitFor(expectRowsMatchStoredAviTasks)
    await sleep(300)
    expectRowsMatchStoredAviTasks()
  })
  it('check_05 DONE task cannot be reopened past the limit', async () => {
    await renderApp()
    const dialog = await openEditor('Dana finished')
    const status = within(dialog).getByLabelText('Status')
    const todo = optionOf(status, 'TODO')
    if (todo.disabled) {
      expect(rowShows('Dana finished', 'DONE')).toBe(true)
      return
    }
    await userEvent.selectOptions(status, todo)
    await save(dialog)
    await expectLimitMessageVisible()
    expect(rowShows('Dana finished', 'DONE')).toBe(true)
  })

  it('check_06 editing a title saves and shows in the row', async () => {
    await renderApp()
    const dialog = await openEditor('Dana open 1')
    await setTitle(dialog, 'Dana brand new title')
    await save(dialog)
    await findRowOf('Dana brand new title')
    expect(getDb().tasks.some((t) => t.title === 'Dana brand new title')).toBe(true)
  })

  it('check_07 assigning via the editor updates the sidebar count', async () => {
    await renderApp()
    const dialog = await openEditor('Loose 1')
    await userEvent.selectOptions(within(dialog).getByLabelText('Assignee'), 'Avi')
    await save(dialog)
    await waitFor(async () => expect(itemText(await memberItem('Avi'))).toMatch(/\b4\b/))
  })
})

