'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function VenueLandingPage({ params }) {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [venue, setVenue] = useState(null)
  const [tiers, setTiers] = useState([])
  const [trainers, setTrainers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
  const accent = '#007AFF'

  useEffect(() => { loadVenue() }, [])

  const loadVenue = async () => {
    const { slug } = await params

    // Load venue
    const { data: venueData } = await supabase
      .from('gyms')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!venueData) { router.push('/venues'); return }
    setVenue(venueData)

    // Load tiers
    const { data: tiersData } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('gym_id', venueData.id)
      .eq('is_active', true)
    setTiers(tiersData || [])

    // Load trainers
    const { data: trainersData } = await supabase
      .from('trainers')
      .select('*')
      .eq('gym_id', venueData.id)
    setTrainers(trainersData || [])

    // Load classes (distinct types)
    const { data: classesData } = await supabase
      .from('classes')
      .select('type, day, time, duration')
      .eq('gym_id', venueData.id)
    setClasses(classesData || [])

    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: '#8E8E93', letterSpacing: '2px', textTransform: 'uppercase' }}>Loading...</div>
    </div>
  )

  if (!venue) return null

  // Get unique class types
  const classTypes = [...new Set(classes.map(c => c.type))]

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: font }}>

      {/* Nav */}
      <div style={{
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={() => router.push('/venues')}
          style={{ background: 'none', border: 'none', color: accent, fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: font, display: 'flex', alignItems: 'center', gap: '4px' }}>
          ← All venues
        </button>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#8E8E93', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          Humanitix Wellness
        </div>
        <button onClick={() => router.push('/onboarding')}
          style={{
            padding: '8px 18px', borderRadius: '10px', border: 'none',
            background: accent, color: 'white', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer', fontFamily: font
          }}>
          Join now
        </button>
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', height: '460px', overflow: 'hidden' }}>
        {venue.hero_image_url
          ? <img src={venue.hero_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' }} />
        }
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)'
        }} />
        {/* Text over hero */}
        <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px' }}>
          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            color: 'white', padding: '4px 12px', borderRadius: '20px',
            fontSize: '12px', fontWeight: '600', marginBottom: '12px'
          }}>
            {venue.category}
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: '800', color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            {venue.name}
          </h1>
          {venue.tagline && (
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{venue.tagline}</p>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* About */}
        {venue.description && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', marginBottom: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', marginBottom: '12px' }}>About</h2>
            <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.7', margin: 0 }}>{venue.description}</p>
          </div>
        )}

        {/* Classes offered */}
        {classTypes.length > 0 && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', marginBottom: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', marginBottom: '20px' }}>Classes</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {classTypes.map(type => (
                <span key={type} style={{
                  background: '#f3f4f6', padding: '8px 16px', borderRadius: '20px',
                  fontSize: '14px', fontWeight: '600', color: '#374151'
                }}>
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Trainers */}
        {trainers.length > 0 && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', marginBottom: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', marginBottom: '20px' }}>Meet the trainers</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {trainers.map(trainer => (
                <div key={trainer.id} style={{ textAlign: 'center', padding: '20px', background: '#f9fafb', borderRadius: '16px' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', margin: '0 auto 12px'
                  }}>
                    {trainer.name.charAt(0)}
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a1a1a' }}>{trainer.name}</div>
                  {trainer.specialty && <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{trainer.specialty}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Membership tiers */}
        {tiers.length > 0 && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', marginBottom: '24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>Membership plans</h2>
            {venue.trial_days > 0 && (
              <p style={{ fontSize: '14px', color: '#16a34a', fontWeight: '600', marginBottom: '20px' }}>
                🎉 {venue.trial_days}-day free trial on all plans
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {tiers.map((tier, i) => (
                <div key={tier.id} style={{
                  padding: '24px', borderRadius: '16px', border: `2px solid ${i === 0 ? accent : '#e5e7eb'}`,
                  background: i === 0 ? '#f0f7ff' : 'white', position: 'relative'
                }}>
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                      background: accent, color: 'white', padding: '3px 12px',
                      borderRadius: '20px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap'
                    }}>
                      MOST POPULAR
                    </div>
                  )}
                  <div style={{ fontWeight: '700', fontSize: '17px', color: '#1a1a1a', marginBottom: '8px' }}>{tier.name}</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: accent, marginBottom: '8px' }}>
                    ${(tier.price_cents / 100).toFixed(0)}
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>/mo</span>
                  </div>
                  {tier.description && <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5', marginBottom: '16px' }}>{tier.description}</p>}
                  <button
                    onClick={() => router.push('/onboarding')}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
                      background: i === 0 ? accent : '#f3f4f6',
                      color: i === 0 ? 'white' : '#374151',
                      fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: font
                    }}>
                    {venue.trial_days > 0 ? 'Start free trial' : 'Get started'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          borderRadius: '20px', padding: '40px', textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
            {venue.trial_days > 0
              ? `Try ${venue.name} free for ${venue.trial_days} days`
              : `Join ${venue.name} today`}
          </p>
          <button
            onClick={() => router.push('/onboarding')}
            style={{
              padding: '16px 40px', background: accent, color: 'white', border: 'none',
              borderRadius: '14px', fontSize: '17px', fontWeight: '700',
              cursor: 'pointer', fontFamily: font
            }}>
            {venue.trial_days > 0 ? `Start ${venue.trial_days}-day free trial` : 'Join now'} →
          </button>
        </div>
      </div>
    </div>
  )
}