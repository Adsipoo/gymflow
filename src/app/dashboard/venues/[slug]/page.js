'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../../layout'
import { useRouter, useParams } from 'next/navigation'

export default function VenuePage() {
  const { profile, supabase } = useUser()
  const router = useRouter()
  const { slug } = useParams()
  const [venue, setVenue] = useState(null)
  const [tiers, setTiers] = useState([])
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  useEffect(() => {
    if (!profile || !slug) return
    async function load() {
      const { data: venueData } = await supabase
        .from('gyms')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!venueData) { router.push('/dashboard/venues'); return }
      setVenue(venueData)

      const [tiersRes, membershipRes] = await Promise.all([
        supabase.from('membership_tiers').select('*').eq('gym_id', venueData.id).eq('is_active', true),
        supabase.from('gym_memberships').select('id').eq('member_id', profile.id).eq('gym_id', venueData.id).in('status', ['active', 'trialing']).limit(1),
      ])

      setTiers(tiersRes.data || [])
      setIsMember((membershipRes.data || []).length > 0)
      setLoading(false)
    }
    load()
  }, [profile, slug])

  const handleSelectTier = async (tier) => {
    setCheckoutLoading(tier.id)
    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  tierId: tier.id,
  gymId: venue.id,
  userId: profile.id,
}),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (e) {
      alert('Something went wrong. Please try again.')
    }
    setCheckoutLoading(null)
  }

  if (loading) return <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>Loading...</div>
  if (!venue) return null

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 100 }}>

      {/* Back */}
      <button onClick={() => router.back()} style={{
        background: 'none', border: 'none', color: '#007AFF', fontSize: 14,
        fontWeight: 500, cursor: 'pointer', padding: '20px 20px 0', display: 'block',
        fontFamily: 'inherit',
      }}>← Back</button>

      {/* Hero */}
      {venue.hero_image_url ? (
        <div style={{ height: 200, overflow: 'hidden', margin: '16px 0 0' }}>
          <img src={venue.hero_image_url} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{ height: 120, background: '#007AFF14', margin: '16px 0 0' }} />
      )}

      {/* Venue Info */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          {venue.logo_url && (
            <img src={venue.logo_url} alt="" style={{
              width: 64, height: 64, borderRadius: 14, objectFit: 'cover',
              border: '2px solid rgba(0,0,0,0.06)', flexShrink: 0,
            }} />
          )}
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1C1C1E', margin: '0 0 4px', letterSpacing: -0.5 }}>{venue.name}</h1>
            <div style={{ fontSize: 13, color: '#8E8E93' }}>{venue.category}{venue.tagline ? ' · ' + venue.tagline : ''}</div>
          </div>
        </div>

        {venue.description && (
          <p style={{ color: '#3A3A3C', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>{venue.description}</p>
        )}

        {/* Already a member */}
        {isMember && (
          <div style={{
            background: '#34C75914', border: '1px solid #34C75930', borderRadius: 14,
            padding: 16, marginBottom: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#34C759', marginBottom: 4 }}>You're a member! 🎉</div>
            <div style={{ fontSize: 13, color: '#8E8E93' }}>You already have an active membership at this venue.</div>
            <button onClick={() => router.push('/dashboard/schedule')} style={{
              marginTop: 12, background: '#34C759', color: '#fff', border: 'none',
              padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Book a Class</button>
          </div>
        )}

        {/* Membership Tiers */}
        {!isMember && (
          <>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E', margin: '0 0 12px' }}>Membership Plans</h2>
            {tiers.length === 0 && (
              <p style={{ color: '#8E8E93', fontSize: 14 }}>No membership plans available yet.</p>
            )}
            {tiers.map(tier => (
              <div key={tier.id} style={{
                background: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 12,
                border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{tier.name}</div>
                    {tier.description && (
                      <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>{tier.description}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E' }}>
                      ${(tier.price_cents / 100).toFixed(0)}
                    </div>
                    <div style={{ fontSize: 12, color: '#8E8E93' }}>AUD/month</div>
                  </div>
                </div>
                {venue.trial_days > 0 && (
                  <div style={{ fontSize: 12, color: '#007AFF', marginBottom: 12 }}>
                    ✦ {venue.trial_days}-day free trial included
                  </div>
                )}
                <button onClick={() => handleSelectTier(tier)} disabled={checkoutLoading === tier.id} style={{
                  width: '100%', padding: 14, borderRadius: 12, border: 'none',
                  background: '#007AFF', color: '#fff', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {checkoutLoading === tier.id ? 'Loading...' : `Get Started with ${tier.name}`}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}