"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Profile, Task, TaskStatus } from '@/lib/types'

const STATUSES: TaskStatus[] = ['Assigned', 'In Progress', 'Done', 'Confirmed']

const STATUS_STYLE: Record<TaskStatus, string> = {
  'Assigned':    'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Done':        'bg-green-100 text-green-700',
  'Confirmed':   'bg-purple-100 text-purple-700',
}

type TaskWithDept = Task & { department?: { name: string } }

export default function MyTasksPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tasks,   setTasks]   = useState<TaskWithDept[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      if (!prof?.church_id) { router.push('/onboarding'); return }
      setProfile(prof)

      const { data } = await supabase
        .from('tasks')
        .select('*, department:departments(name)')
        .eq('assignee_id', session.user.id)
        .order('due_date', { ascending: true, nullsFirst: false })

      setTasks(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    await supabase.from('tasks').update({ status }).eq('id', taskId)
  }

  const isOverdue = (t: Task) =>
    !!t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Done' && t.status !== 'Confirmed'

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  )

  const active = tasks.filter(t => t.status !== 'Done' && t.status !== 'Confirmed')
  const done   = tasks.filter(t => t.status === 'Done'  || t.status === 'Confirmed')
  const overdueCount = active.filter(isOverdue).length

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you
          {overdueCount > 0 && (
            <span className="ml-2 text-red-600 font-medium">· {overdueCount} overdue</span>
          )}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No tasks assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active */}
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Active — {active.length}
              </h2>
              <div className="space-y-2">
                {active.map(task => (
                  <div key={task.id}
                    className={`p-4 rounded-xl border ${isOverdue(task) ? 'border-red-300 bg-red-50' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {isOverdue(task) && (
                            <span className="text-xs font-semibold text-red-600">⚠ OVERDUE</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[task.status]}`}>
                            {task.status}
                          </span>
                          {task.department && (
                            <span className="text-xs text-gray-400">{task.department.name}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                        )}
                        {task.due_date && (
                          <p className={`text-xs mt-1.5 ${isOverdue(task) ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                            Due: {new Date(task.due_date).toLocaleDateString('en-NG', {
                              weekday: 'short', day: 'numeric', month: 'short',
                            })}
                          </p>
                        )}
                      </div>
                      <select value={task.status}
                        onChange={e => updateStatus(task.id, e.target.value as TaskStatus)}
                        className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 flex-shrink-0">
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {done.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Completed — {done.length}
              </h2>
              <div className="space-y-2 opacity-60">
                {done.map(task => (
                  <div key={task.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[task.status]}`}>
                          {task.status}
                        </span>
                        {task.department && <span className="text-xs text-gray-400">{task.department.name}</span>}
                      </div>
                      <p className="text-sm text-gray-500 line-through">{task.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
