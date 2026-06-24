"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()

      if (!profile?.church_id) { router.push('/onboarding'); return }

      if (profile.role === 'admin_lead' || profile.role === 'pastor') {
        router.push('/dashboard')
      } else {
        router.push('/dashboard/my-tasks')
      }
    }
    check()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  )
}
