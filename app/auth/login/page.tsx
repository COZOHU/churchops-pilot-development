"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })

    if (authErr) { setError(authErr.message); setLoading(false); return }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).single()

      if (!profile?.church_id) { router.push('/onboarding'); return }

      if (profile.role === 'admin_lead' || profile.role === 'pastor') {
        router.push('/dashboard')
      } else {
        router.push('/dashboard/my-tasks')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ChurchOps Pilot</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@church.org" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-gray-500">
            No account?{' '}
            <Link href="/auth/sign-up" className="text-blue-600 hover:underline font-medium">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
