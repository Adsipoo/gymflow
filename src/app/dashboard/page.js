'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(prof)
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
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8E8E93', letterSpacing: 2, textTransform: 'uppercase' }}>
            Loading...
          </div>
        </div>
      </div>
    )
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?'

  return (
    <div style={{
      minHeight: '100vh', background: '#F2F2F7',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      padding: 20,
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 32,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            GymFlow
          </div>
          <button
            onClick={handleSignOut}
            style={{
              background: 'none', border: '1px solid rgba(0,0,0,0.08)',
              color: '#8E8E93', padding: '6px 12px', borderRadius: 8,
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Sign out
          </button>
        </div>

        {/* Welcome */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>
          Welcome, {profile?.full_name || 'there'}
        </h1>
        <p style={{ color: '#8E8E93', fontSize: 14, margin: '0 0 32px' }}>
          Your account is set up and ready to go.
        </p>

        {/* Profile Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: 16, padding: 24,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: '#007AFF15', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: '#636366',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>
                {profile?.full_name}
              </div>
              <div style={{ fontSize: 14, color: '#8E8E93' }}>{profile?.email}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Role', profile?.role || '—'],
              ['Tier', profile?.tier || '—'],
              ['Status', profile?.status || '—'],
              ['Member since', profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString() : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{
                background: '#F2F2F7', padding: '12px 14px', borderRadius: 12,
              }}>
                <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div style={{
          background: '#FFFFFF', borderRadius: 16, padding: 24,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 8 }}>
            What's next
          </div>
          <p style={{ color: '#8E8E93', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Authentication is working. Your profile has been created in the database.
            We'll be adding class booking, check-in, and payments next.
          </p>
        </div>
      </div>
    </div>
  )
}
