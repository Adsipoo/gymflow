'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useRouter, useParams } from 'next/navigation'

const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"

export default function JoinPage() {
  const { slug } = useParams()
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [venue, setVenue] = useState(null)
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    async function load() {
      const { data: venueData } = await supabase
        .from('gyms')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!venueData) { router.push('/login'); return }
      setVenue(venueData)

      const { data: tiersData } = await supabase
        .from('membership_tiers')
        .select('*')
        .eq('gym_id', venueData.id)
        .eq('is_active', true)

      setTiers(tiersData || [])
      setLoading(false)
    }
    load()
  }, [slug])

  const handleSelectTier = async (tier) => {
    // Check if already logged in
    const { data: { user } } = await supabase.auth.getUser()

    // Save the intended destination so we can return after auth
    localStorage.setItem('joinSlug', slug)
    localStorage.setItem('joinTierId', tier.id)

    if (user) {
      // Already logged in — go straight to checkout
      router.push(`/join/${slug}/checkout?tierId=${tier.id}`)
    } else {
      // Not logged in — send to login with return path
      router.push(`/login?return=/join/${slug}/checkout?tierId=${tier.id}`)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#8E8E93', letterSpacing: 2, textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  if (!venue) return null

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: font }}>

      {/* Hero */}
      {venue.hero_image_url ? (
        <div style={{ height: 260, overflow: 'hidden', position: 'relative' }}>
          <img src={venue.hero_image_url} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5))' }} />
          <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Humanitix Wellness
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: -0.5 }}>{venue.name}</h1>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{venue.category}{venue.tagline ? ' · ' + venue.tagline : ''}</div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#007AFF', padding: '48px 24px 32px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
            Humanitix Wellness
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: -0.5 }}>{venue.name}</h1>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{venue.category}{venue.tagline ? ' · ' + venue.tagline : ''}</div>
        </div>
      )}

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Venue info */}
        {venue.description && (
          <div style={{
            background: '#FFFFFF', borderRadius: 16, padding: 20,
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 24,
          }}>
            <p style={{ color: '#3A3A3C', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{venue.description}</p>
          </div>
        )}

        {/* Tiers */}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: '0 0 16px', letterSpacing: -0.3 }}>
          Choose a membership
        </h2>

        {tiers.length === 0 && (
          <p style={{ color: '#8E8E93', fontSize: 14 }}>No membership plans available yet.</p>
        )}

        {tiers.map(tier => (
          <div key={tier.id} style={{
            background: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 12,
            border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{tier.name}</div>
                {tier.description && <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>{tier.description}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1C1C1E' }}>${(tier.price_cents / 100).toFixed(0)}</div>
                <div style={{ fontSize: 12, color: '#8E8E93' }}>AUD/month</div>
              </div>
            </div>
            {venue.trial_days > 0 && (
              <div style={{ fontSize: 13, color: '#007AFF', marginBottom: 12 }}>✦ {venue.trial_days}-day free trial included</div>
            )}
            <button onClick={() => handleSelectTier(tier)} style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: '#007AFF', color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: font,
            }}>
              Get Started
            </button>
          </div>
        ))}

        <p style={{ textAlign: 'center', color: '#8E8E93', fontSize: 13, marginTop: 24 }}>
          Already a member? <a href="/login" style={{ color: '#007AFF', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}