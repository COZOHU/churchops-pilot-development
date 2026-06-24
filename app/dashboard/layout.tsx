"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [church, setChurch]   = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      if (!prof?.church_id) { router.push('/onboarding'); return }
      setProfile(prof)

      const { data: c } = await supabase
        .from('churches').select('name').eq('id', prof.church_id).single()
      if (c) setChurch(c.name)
    }
    init()
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isAdmin   = profile?.role === 'admin_lead'
  const isPastor  = profile?.role === 'pastor'
  const showDash  = isAdmin || isPastor

  const navItems = [
    ...(showDash ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    { href: '/dashboard/my-tasks', label: 'My Tasks' },
  ]

  const roleLabel: Record<string, string> = {
    admin_lead:      'Admin Lead',
    department_head: 'Dept. Head',
    worker:          'Worker',
    pastor:          'Pastor',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">ChurchOps</p>
          {church && <p className="text-xs text-gray-500 mt-0.5 truncate">{church}</p>}
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              {item.label}
            </Link>
          ))}
        </nav>

        {profile && (
          <div className="px-2 py-3 border-t border-gray-100">
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-semibold text-gray-800 truncate">{profile.name}</p>
              <p className="text-xs text-gray-400">{roleLabel[profile.role] ?? profile.role}</p>
            </div>
            <button onClick={signOut}
              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
