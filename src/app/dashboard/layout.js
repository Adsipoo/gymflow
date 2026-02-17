'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useRouter, usePathname } from 'next/navigation'

const UserCtx = createContext(null)
export function useUser() { return useContext(UserCtx) }

const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif"

const IC = {
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  list: "M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z",
  calendar: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z",
  chart: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
  person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  people: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  palette: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-1 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z",
}

function NavIcon({ d, active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? color : '#8E8E93'}>
      <path d={d} />
    </svg>
  )
}

const memberNav = [
  { id: '/dashboard', label: 'Home', icon: IC.home },
  { id: '/dashboard/schedule', label: 'Classes', icon: IC.list },
  { id: '/dashboard/bookings', label: 'Bookings', icon: IC.calendar },
  { id: '/dashboard/progress', label: 'Progress', icon: IC.chart },
  { id: '/dashboard/account', label: 'Account', icon: IC.person },
]

const adminNav = [
  { id: '/dashboard', label: 'Dashboard', icon: IC.home },
  { id: '/dashboard/classes', label: 'Classes', icon: IC.list },
  { id: '/dashboard/members', label: 'Members', icon: IC.people },
  { id: '/dashboard/reviews', label: 'Reviews', icon: IC.star },
  { id: '/dashboard/branding', label: 'Brand', icon: IC.palette },
  { id: '/dashboard/account', label: 'Account', icon: IC.person },
]

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [gym, setGym] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const pathname = usePathname()
  const accent = '#007AFF'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUser(user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      // Load gym
      const { data: gymData } = await supabase
        .from('gyms')
        .select('*')
        .limit(1)
        .single()
      setGym(gymData)

      setLoading(false)
    }
    load()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F2F2F7', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: font,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#8E8E93', letterSpacing: 2, textTransform: 'uppercase' }}>
          Loading...
        </div>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'
  const nav = isAdmin ? adminNav : memberNav

  return (
    <UserCtx.Provider value={{ user, profile, gym, supabase, setProfile }}>
      <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: font }}>
        {/* Header */}
        <div style={{
          background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '14px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {gym?.name || 'GymFlow'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isAdmin && (
              <span style={{
                background: accent + '10', border: '1px solid ' + accent + '25',
                color: accent, padding: '4px 10px', borderRadius: 6,
                fontSize: 11, fontWeight: 600,
              }}>
                Admin
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#34C759',
              background: '#34C75914', padding: '4px 10px', borderRadius: 6,
            }}>
              {profile?.tier === 'allAccess' ? 'All-Access' : profile?.tier ? profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1) : 'Basic'}
            </span>
            <button onClick={handleSignOut} style={{
              background: 'none', border: '1px solid rgba(0,0,0,0.08)',
              color: '#8E8E93', padding: '4px 10px', borderRadius: 6,
              fontSize: 11, cursor: 'pointer', fontFamily: font,
            }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Page Content */}
        {children}

        {/* Bottom Nav */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', justifyContent: 'space-around',
          padding: '6px 0 10px', zIndex: 100,
        }}>
          {nav.map(n => (
            <button
              key={n.id}
              onClick={() => router.push(n.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '4px 8px', minWidth: 48, fontFamily: font,
              }}
            >
              <NavIcon d={n.icon} active={pathname === n.id} color={accent} />
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: -0.1,
                color: pathname === n.id ? accent : '#8E8E93',
              }}>
                {n.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </UserCtx.Provider>
  )
}
