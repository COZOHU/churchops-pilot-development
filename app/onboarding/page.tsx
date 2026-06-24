"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEFAULT_DEPTS = ['Choir', 'Media', 'Welfare', 'Protocol', 'Ushering', 'Evangelism']

export default function OnboardingPage() {
  const router = useRouter()
  const [tab, setTab]             = useState<'create' | 'join'>('create')
  const [churchName, setChurchName] = useState('')
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [userId, setUserId]       = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setUserId(session.user.id)

      const { data: profile } = await supabase
        .from('profiles').select('church_id, role').eq('id', session.user.id).single()

      if (profile?.church_id) {
        router.push(profile.role === 'admin_lead' || profile.role === 'pastor' ? '/dashboard' : '/dashboard/my-tasks')
      }
    }
    init()
  }, [router])

  const searchChurches = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    const { data } = await supabase.from('churches').select('id, name').ilike('name', `%${q}%`).limit(6)
    setResults(data || [])
  }

  const createChurch = async () => {
    if (!churchName.trim() || !userId) return
    setLoading(true); setError('')

    const { data: church, error: cErr } = await supabase
      .from('churches').insert({ name: churchName.trim() }).select().single()

    if (cErr || !church) { setError(cErr?.message || 'Failed to create church'); setLoading(false); return }

    await supabase.from('departments').insert(DEFAULT_DEPTS.map(name => ({ church_id: church.id, name })))
    await supabase.from('profiles').update({ church_id: church.id, role: 'admin_lead' }).eq('id', userId)

    setLoading(false)
    router.push('/dashboard')
  }

  const joinChurch = async (churchId: string) => {
    if (!userId) return
    setLoading(true)

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', userId).single()

    await supabase.from('profiles').update({ church_id: churchId }).eq('id', userId)

    setLoading(false)
    const role = profile?.role
    router.push(role === 'admin_lead' || role === 'pastor' ? '/dashboard' : '/dashboard/my-tasks')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Set up your church</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new church or join an existing one</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          {/* Tabs */}
          <div className="flex rounded-lg border border-gray-200 p-0.5 mb-6 gap-0.5">
            {(['create', 'join'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === t ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                {t === 'create' ? 'Create Church' : 'Join Church'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          {tab === 'create' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Church Name</label>
                <input type="text" value={churchName} onChange={e => setChurchName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Grace Chapel Lagos" />
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                <p className="font-medium mb-1">Created automatically:</p>
                <p className="text-gray-500">{DEFAULT_DEPTS.join(' · ')}</p>
                <p className="mt-1 text-gray-500">You will be set as Admin Lead.</p>
              </div>
              <button onClick={createChurch} disabled={loading || !churchName.trim()}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {loading ? 'Creating…' : 'Create Church'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Church Name</label>
                <input type="text" value={query} onChange={e => searchChurches(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type to search…" />
              </div>
              {results.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                  {results.map(c => (
                    <button key={c.id} onClick={() => joinChurch(c.id)} disabled={loading}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 transition-colors disabled:opacity-50">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Tap to join</p>
                    </button>
                  ))}
                </div>
              )}
              {query.length >= 2 && results.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-3">
                  No church found. Ask your admin for the exact name.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
