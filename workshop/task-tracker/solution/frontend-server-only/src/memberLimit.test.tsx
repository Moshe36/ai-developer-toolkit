import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { getDb, resetDb } from './mocks/db'
import type { Task } from './types'

const task = (id: number, title: string, status: Task['status'], assigneeId: number | null): Task => ({
  id,
  title,
  status,
  assigneeId,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, id)).toISOString(),
})

function seedDanaAtLimit() {
  resetDb({
    members: [
      { id: 1, name: 'Dana' },
      { id: 2, name: 'Avi' },
    ],
    tasks: [
      task(1, 'Dana open 1', 'TODO', 1),
      task(2, 'Dana open 2', 'TODO', 1),
      task(3, 'Dana open 3', 'IN_PROGRESS', 1),
      task(4, 'Dana open 4', 'IN_PROGRESS', 1),
      task(5, 'Dana open 5', 'TODO', 1),
      task(6, 'Dana finished', 'DONE', 1),
      task(7, 'Avi open 1', 'TODO', 2),
      task(8, 'Loose 1', 'TODO', null),
      task(9, 'Loose 2', 'TODO', null),
    ],
  })
}

async function renderApp() {
  seedDanaAtLimit()
  render(<App />)
  await screen.findByText('Dana open 1')
}

async function openEditor(title: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Edit ${title}` }))
  return screen.findByRole('dialog', { name: 'Edit task' })
}

function assigneeOf(title: string) {
  return getDb().tasks.find((t) => t.title === title)!.assigneeId
}

describe('member open-task limit', () => {
  it('sidebarShowsOpenCountAgainstLimit', async () => {
    await renderApp()
    const sidebar = await screen.findByRole('complementary', { name: 'Members' })
    expect(await within(sidebar).findByText('Dana (5/5 open)')).toBeInTheDocument()
    expect(within(sidebar).getByText('Avi (1/5 open)')).toBeInTheDocument()
  })

  it('drawerShowsServerErrorAndStaysOpenWhenReassigningOverTheLimit', async () => {
    await renderApp()
    const dialog = await openEditor('Avi open 1')
    await userEvent.selectOptions(within(dialog).getByLabelText('Assignee'), 'Dana')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/limit/i)
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument()
    expect(assigneeOf('Avi open 1')).toBe(2)
  })

  it('drawerRejectsReopeningADoneTaskPastTheLimit', async () => {
    await renderApp()
    const dialog = await openEditor('Dana finished')
    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'TODO')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/limit/i)
    expect(getDb().tasks.find((t) => t.title === 'Dana finished')!.status).toBe('DONE')
  })

  it('bulkAssignShowsServerErrorAndLeavesRowsUnchanged', async () => {
    await renderApp()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Loose 1' }))
    await userEvent.selectOptions(screen.getByLabelText('Assign selected to'), 'Dana')
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/limit/i)
    const row = screen.getByText('Loose 1').closest('tr')!
    expect(within(row).getByText('Unassigned')).toBeInTheDocument()
    expect(assigneeOf('Loose 1')).toBeNull()
  })
})
