import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

async function renderApp() {
  render(<App />)
  await screen.findByText('Design login page')
}

function rowTitles() {
  return screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[1].textContent)
}

describe('App', () => {
  it('listsTasksWithAssignees', async () => {
    await renderApp()
    const row = screen.getByText('Plan sprint').closest('tr')!
    expect(within(row).getByText('Avi')).toBeInTheDocument()
    const unassigned = screen.getByText('Triage bug reports').closest('tr')!
    expect(within(unassigned).getByText('Unassigned')).toBeInTheDocument()
  })

  it('filtersByStatus', async () => {
    await renderApp()
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'DONE')
    expect(rowTitles()).toEqual(['Set up CI', 'Create database schema'])
  })

  it('sortsByTitle', async () => {
    await renderApp()
    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'title')
    const titles = rowTitles()
    expect(titles).toEqual([...titles].sort((a, b) => a!.localeCompare(b!)))
  })

  it('editsTitle', async () => {
    await renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'Edit Plan sprint' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit task' })
    const title = within(dialog).getByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Plan next sprint')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Plan next sprint')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('bulkAssignsSelected', async () => {
    await renderApp()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Write release notes' }))
    await userEvent.selectOptions(screen.getByLabelText('Assign selected to'), 'Noa')
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }))
    const row = screen.getByText('Write release notes').closest('tr')!
    expect(within(row).getByText('Noa')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Noa (3)')).toBeInTheDocument())
  })

  it('sidebarShowsAssignedCounts', async () => {
    await renderApp()
    const sidebar = await screen.findByRole('complementary', { name: 'Members' })
    expect(await within(sidebar).findByText('Dana (6)')).toBeInTheDocument()
    expect(within(sidebar).getByText('Avi (3)')).toBeInTheDocument()
    expect(within(sidebar).getByText('Noa (2)')).toBeInTheDocument()
  })
})
