'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"

export default function PickVenuePage() {
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('gym_memberships')
        .select('*, gyms(*), membership_tiers(name)')
        .eq('member_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })

      setMemberships(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handlePick = (gymId) => {
    localStorage.setItem('activeGymId', gymId)
    router.push('/dashboard')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#8E8E93', letterSpacing: 2, textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', background: '#F2F2F7', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: font, padding: 20,
    }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8E8E93', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Humanitix Wellness
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 8px' }}>
            Where to today?
          </h1>
          <p style={{ color: '#8E8E93', fontSize: 15, margin: 0 }}>
            Choose a venue to get started
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {memberships.map(ms => {
            const gym = ms.gyms
            const tier = ms.membership_tiers
            return (
              <button key={ms.id} onClick={() => handlePick(ms.gym_id)} style={{
                background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 16, padding: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                fontFamily: font, textAlign: 'left', width: '100%',
              }}>
                {gym?.logo_url ? (
                  <img src={gym.logo_url} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 52, height: 52, borderRadius: 12, background: '#007AFF15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>🏋️</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E' }}>{gym?.name}</div>
                  <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{gym?.category} · {tier?.name}</div>
                </div>
                <div style={{ color: '#007AFF', fontSize: 20 }}>›</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}