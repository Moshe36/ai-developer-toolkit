import { useCallback, useEffect, useState } from 'react'
import { fetchMembers, fetchTasks } from './api'
import { MemberSidebar } from './MemberSidebar'
import { TaskTable } from './TaskTable'
import type { Member, Task } from './types'

export function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])

  const refetch = useCallback(async () => {
    const [nextTasks, nextMembers] = await Promise.all([fetchTasks(), fetchMembers()])
    setTasks(nextTasks)
    setMembers(nextMembers)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return (
    <div style={{ display: 'flex', gap: 24, fontFamily: 'sans-serif' }}>
      <MemberSidebar members={members} />
      <main style={{ flex: 1 }}>
        <h1>Team Task Tracker</h1>
        <TaskTable tasks={tasks} members={members} setTasks={setTasks} onMutated={refetch} />
      </main>
    </div>
  )
}
