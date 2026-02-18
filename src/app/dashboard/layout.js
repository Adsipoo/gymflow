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
  fitness: "M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z",
  logout: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
  bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
}

function NavIcon({ d, active, color, size }) {
  return (
    <svg width={size || 22} height={size || 22} viewBox="0 0 24 24" fill={active ? color : '#8E8E93'}>
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
  { id: '/dashboard/notifications', label: 'Notify', icon: IC.bell },
  { id: '/dashboard/branding', label: 'Brand', icon: IC.palette },
  { id: '/dashboard/trainers', label: 'Trainers', icon: IC.fitness },
  { id: '/dashboard/account', label: 'Account', icon: IC.person },
]

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [gym, setGym] = useState(null)
  const [membership, setMembership] = useState(null) // { tier_id, status, ... }
  const [tierLabel, setTierLabel] = useState('Member')
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(true)
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const pathname = usePathname()
  const accent = '#007AFF'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

      let gymData = null

      if (prof.role === 'owner') {
        const { data } = await supabase
          .from('gyms')
          .select('*')
          .eq('owner_id', prof.id)
          .single()
        gymData = data
        setTierLabel('Owner')
      } else {
        // For members, get their most recent active gym membership
        const { data } = await supabase
          .from('gym_memberships')
          .select('*, gyms(*), membership_tiers(name)')
          .eq('member_id', prof.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        gymData = data?.gyms || null
        if (data?.membership_tiers?.name) setTierLabel(data.membership_tiers.name)
        if (data) setMembership(data) // exposes tier_id, status, etc. to all pages
      }

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
    <UserCtx.Provider value={{ user, profile, gym, membership, supabase, setProfile }}>
      <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: font, display: 'flex' }}>

        {/* Desktop Sidebar */}
        {!isMobile && (
          <div style={{
            width: 240, background: '#FFFFFF', borderRight: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', flexDirection: 'column', position: 'fixed',
            top: 0, left: 0, bottom: 0, zIndex: 100, padding: '24px 0',
          }}>
            <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#8E8E93',
                letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
              }}>
                {gym?.name || 'Humanitix Wellness'}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {isAdmin && (
                  <span style={{
                    background: accent + '10', border: '1px solid ' + accent + '25',
                    color: accent, padding: '3px 8px', borderRadius: 6,
                    fontSize: 10, fontWeight: 600,
                  }}>Admin</span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#34C759',
                  background: '#34C75914', padding: '3px 8px', borderRadius: 6,
                }}>{tierLabel}</span>
              </div>
            </div>

            <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {nav.map(n => {
                const active = pathname === n.id
                return (
                  <button key={n.id} onClick={() => router.push(n.id)}
                    style={{
                      background: active ? accent + '0A' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 10,
                      fontFamily: font, width: '100%', textAlign: 'left',
                    }}
                  >
                    <NavIcon d={n.icon} active={active} color={accent} size={20} />
                    <span style={{
                      fontSize: 14, fontWeight: active ? 600 : 500,
                      color: active ? accent : '#3A3A3C',
                    }}>
                      {n.label}
                    </span>
                  </button>
                )
              })}
            </div>

            <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button onClick={handleSignOut}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  fontFamily: font, width: '100%', textAlign: 'left',
                }}
              >
                <NavIcon d={IC.logout} active={false} color="#FF3B30" size={20} />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#8E8E93' }}>Sign out</span>
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, marginLeft: isMobile ? 0 : 240, minHeight: '100vh' }}>
          {isMobile && (
            <div style={{
              background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.06)',
              padding: '14px 20px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {gym?.name || 'Humanitix Wellness'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isAdmin && (
                  <span style={{
                    background: accent + '10', border: '1px solid ' + accent + '25',
                    color: accent, padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600,
                  }}>Admin</span>
                )}
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#34C759',
                  background: '#34C75914', padding: '4px 10px', borderRadius: 6,
                }}>{tierLabel}</span>
                <button onClick={handleSignOut} style={{
                  background: 'none', border: '1px solid rgba(0,0,0,0.08)',
                  color: '#8E8E93', padding: '4px 10px', borderRadius: 6,
                  fontSize: 11, cursor: 'pointer', fontFamily: font,
                }}>Sign out</button>
              </div>
            </div>
          )}

          {children}

          {isMobile && (
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', justifyContent: 'space-around',
              padding: '6px 0 10px', zIndex: 100,
            }}>
              {nav.map(n => (
                <button key={n.id} onClick={() => router.push(n.id)}
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
          )}
        </div>
      </div>
    </UserCtx.Provider>
  )
}