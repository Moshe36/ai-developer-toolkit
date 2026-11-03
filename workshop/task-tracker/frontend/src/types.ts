export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type Task = {
  id: number
  title: string
  status: Status
  assigneeId: number | null
  createdAt: string
}

export type Member = {
  id: number
  name: string
  assignedTaskCount: number
  openTaskCount: number
  openTaskLimit: number
}
