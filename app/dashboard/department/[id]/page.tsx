"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Department, Profile, Task, TaskStatus } from '@/lib/types'

const STATUSES: TaskStatus[] = ['Assigned', 'In Progress', 'Done', 'Confirmed']

const COL_STYLE: Record<TaskStatus, string> = {
  'Assigned':   'bg-gray-100 text-gray-700',
  'In Progress':'bg-blue-100 text-blue-700',
  'Done':       'bg-green-100 text-green-700',
  'Confirmed':  'bg-purple-100 text-purple-700',
}

export default function DepartmentPage() {
  const params = useParams()
  const router = useRouter()
  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [department, setDepartment] = useState<Department | null>(null)
  const [tasks,      setTasks]      = useState<(Task & { assignee?: Profile })[]>([])
  const [members,    setMembers]    = useState<Profile[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [form, setForm] = useState({ title: '', description: '', assignee_id: '', due_date: '' })

  const canCreate = profile?.role === 'admin_lead' || profile?.role === 'department_head'
  const canEdit   = profile?.role !== 'pastor'

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      if (!prof?.church_id) { router.push('/onboarding'); return }
      setProfile(prof)

      const { data: dept } = await supabase
        .from('departments').select('*').eq('id', params.id).single()
      if (!dept) { router.push('/dashboard'); return }
      setDepartment(dept)

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!tasks_assignee_id_fkey(id, name, role)')
        .eq('department_id', params.id)
        .order('created_at', { ascending: false })
      setTasks(taskData || [])

      const { data: memberData } = await supabase
        .from('profiles').select('*').eq('church_id', prof.church_id).order('name')
      setMembers(memberData || [])

      setLoading(false)
    }
    load()
  }, [params.id, router])

  const createTask = async () => {
    if (!form.title.trim() || !profile || !department) return
    setSaving(true); setError('')

    const { data, error: err } = await supabase
      .from('tasks')
      .insert({
        church_id:    profile.church_id,
        department_id: department.id,
        title:         form.title.trim(),
        description:   form.description || null,
        assignee_id:   form.assignee_id || null,
        due_date:      form.due_date    || null,
        status:        'Assigned',
      })
      .select('*, assignee:profiles!tasks_assignee_id_fkey(id, name, role)')
      .single()

    if (err)        { setError(err.message) }
    else if (data)  {
      setTasks(prev => [data, ...prev])
      setForm({ title: '', description: '', assignee_id: '', due_date: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  const updateStatus = async (taskId: string, status: TaskStatus) => {
    if (!canEdit) return
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

  const byStatus = STATUSES.reduce((a, s) => {
    a[s] = tasks.filter(t => t.status === s); return a
  }, {} as Record<TaskStatus, typeof tasks>)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900">{department?.name}</span>
        </div>
        {canCreate && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + New Task
          </button>
        )}
      </div>

      {/* New task form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Task</h3>
          {error && <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. Prepare Sunday announcements" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Optional details…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assign to</label>
              <select value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="">— Unassigned —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createTask} disabled={saving || !form.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Create Task'}
            </button>
            <button onClick={() => { setShowForm(false); setError('') }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-4 gap-3">
        {STATUSES.map(status => (
          <div key={status} className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COL_STYLE[status]}`}>
                {status}
              </span>
              <span className="text-xs text-gray-400 font-medium">{byStatus[status].length}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 min-h-40">
              {byStatus[status].map(task => (
                <div key={task.id}
                  className={`p-3 rounded-lg border text-xs ${isOverdue(task) ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                  <p className="font-semibold text-gray-900 leading-snug mb-1">{task.title}</p>
                  {task.description && (
                    <p className="text-gray-500 line-clamp-2 mb-1">{task.description}</p>
                  )}
                  {task.assignee && (
                    <p className="text-gray-400">→ {task.assignee.name}</p>
                  )}
                  {task.due_date && (
                    <p className={`mt-1 font-medium ${isOverdue(task) ? 'text-red-600' : 'text-gray-400'}`}>
                      {isOverdue(task) ? '⚠ ' : ''}
                      {new Date(task.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                  {canEdit && (
                    <select value={task.status}
                      onChange={e => updateStatus(task.id, e.target.value as TaskStatus)}
                      className="mt-2 w-full text-xs px-2 py-1 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              ))}
              {byStatus[status].length === 0 && (
                <p className="text-xs text-gray-300 text-center pt-6">Empty</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
