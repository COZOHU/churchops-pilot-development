"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Department, Profile } from '@/lib/types'

interface DeptStat {
  dept: Department
  overdue: number
  atRisk: number
  done: number
  total: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [stats, setStats]       = useState<DeptStat[]>([])
  const [church, setChurch]     = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      if (!prof?.church_id)    { router.push('/onboarding');      return }
      if (prof.role !== 'admin_lead' && prof.role !== 'pastor') {
        router.push('/dashboard/my-tasks'); return
      }
      setProfile(prof)

      const { data: c } = await supabase
        .from('churches').select('name').eq('id', prof.church_id).single()
      if (c) setChurch(c.name)

      const { data: depts } = await supabase
        .from('departments').select('*').eq('church_id', prof.church_id).order('name')

      const { data: tasks } = await supabase
        .from('tasks').select('*').eq('church_id', prof.church_id)

      const now           = new Date()
      const threeDays     = new Date(now.getTime() + 3 * 86_400_000)
      const active        = (s: string) => s !== 'Done' && s !== 'Confirmed'

      const deptStats: DeptStat[] = (depts || []).map(dept => {
        const dt = (tasks || []).filter(t => t.department_id === dept.id)
        return {
          dept,
          total:   dt.length,
          overdue: dt.filter(t => t.due_date && new Date(t.due_date) < now  && active(t.status)).length,
          atRisk:  dt.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= threeDays && active(t.status)).length,
          done:    dt.filter(t => !active(t.status)).length,
        }
      })

      setStats(deptStats)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  )

  const totals = stats.reduce((a, s) => ({
    overdue: a.overdue + s.overdue,
    atRisk:  a.atRisk  + s.atRisk,
    done:    a.done    + s.done,
  }), { overdue: 0, atRisk: 0, done: 0 })

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{church}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {profile?.role === 'pastor' ? 'Pastor view — read only' : 'Admin dashboard'}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Overdue',          value: totals.overdue, cls: 'border-red-200 bg-red-50 text-red-700' },
          { label: 'At risk (3 days)', value: totals.atRisk,  cls: 'border-amber-200 bg-amber-50 text-amber-700' },
          { label: 'Done / Confirmed', value: totals.done,    cls: 'border-green-200 bg-green-50 text-green-700' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs mt-0.5 opacity-75">{label}</p>
          </div>
        ))}
      </div>

      {/* Department list */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Departments — {stats.length}
        </h2>

        {stats.length === 0 ? (
          <p className="text-sm text-gray-400">No departments found.</p>
        ) : (
          <div className="space-y-2">
            {stats.map(({ dept, overdue, atRisk, done, total }) => (
              <Link key={dept.id} href={`/dashboard/departments/${dept.id}`}>
                <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group">
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                      {dept.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{total} task{total !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                        {overdue} overdue
                      </span>
                    )}
                    {atRisk > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                        {atRisk} at risk
                      </span>
                    )}
                    {done > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        {done} done
                      </span>
                    )}
                    {total === 0 && <span className="text-xs text-gray-300">No tasks</span>}
                    <span className="text-gray-300 text-xs ml-1">›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
