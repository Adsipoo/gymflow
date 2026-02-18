'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

const CATEGORIES = [
  'Gym', 'Yoga Studio', 'Wellness Center', 'Pilates Studio',
  'Boxing Gym', 'CrossFit Box', 'PT Studio', 'Dance Studio',
  'Martial Arts', 'Swimming Center', 'Other'
]

export default function VenueDirectory() {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  useEffect(() => { fetchVenues('', 'All') }, [])

  const fetchVenues = async (query, category) => {
    setLoading(true)
    let q = supabase.from('gyms').select(`*, membership_tiers(*)`)
    if (query) q = q.ilike('name', `%${query}%`)
    if (category !== 'All') q = q.eq('category', category)
    const { data } = await q
    setVenues(data || [])
    setLoading(false)
  }

  const handleSearch = (query, category) => {
    setSearchQuery(query)
    setCategoryFilter(category)
    fetchVenues(query, category)
  }

  const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
  const accent = '#007AFF'

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: font }}>

      {/* Header */}
      <div style={{
        background: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '16px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#8E8E93', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          Humanitix Wellness
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/login')}
            style={{
              padding: '8px 18px', borderRadius: '10px', border: `1.5px solid ${accent}`,
              background: 'white', color: accent, fontSize: '14px', fontWeight: '600',
              cursor: 'pointer', fontFamily: font
            }}>
            Sign in
          </button>
          <button onClick={() => router.push('/login')}
            style={{
              padding: '8px 18px', borderRadius: '10px', border: 'none',
              background: accent, color: 'white', fontSize: '14px', fontWeight: '600',
              cursor: 'pointer', fontFamily: font
            }}>
            Get started
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`,
        padding: '80px 24px', textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '48px', fontWeight: '800', color: 'white',
          letterSpacing: '-1px', marginBottom: '16px', lineHeight: 1.1
        }}>
          Find your perfect venue
        </h1>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', marginBottom: '40px' }}>
          Discover gyms, studios and wellness centers near you
        </p>

        {/* Search bar */}
        <div style={{ maxWidth: '560px', margin: '0 auto', position: 'relative' }}>
          <input
            style={{
              width: '100%', padding: '18px 24px', borderRadius: '16px',
              border: 'none', fontSize: '16px', outline: 'none',
              boxSizing: 'border-box', fontFamily: font,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value, categoryFilter)}
          />
        </div>
      </div>

      {/* Category filters */}
      <div style={{ padding: '24px 24px 0', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['All', ...CATEGORIES].map(cat => (
            <button key={cat}
              onClick={() => handleSearch(searchQuery, cat)}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '13px',
                fontWeight: '600', cursor: 'pointer', border: '1.5px solid',
                borderColor: categoryFilter === cat ? accent : '#e5e7eb',
                background: categoryFilter === cat ? '#f0f7ff' : 'white',
                color: categoryFilter === cat ? accent : '#6b7280',
                fontFamily: font
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Venue grid */}
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8E8E93', fontSize: '14px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Loading venues...
          </div>
        ) : venues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <p style={{ color: '#8E8E93', fontSize: '16px' }}>No venues found. Try a different search.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px'
          }}>
            {venues.map(venue => (
              <div key={venue.id}
                onClick={() => router.push(`/venues/${venue.slug}`)}
                style={{
                  background: 'white', borderRadius: '20px', overflow: 'hidden',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.06)', cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  border: '1px solid rgba(0,0,0,0.04)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)'
                }}
              >
                {/* Hero image */}
                <div style={{ height: '200px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', position: 'relative', overflow: 'hidden' }}>
                  {venue.hero_image_url
                    ? <img src={venue.hero_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🏋️</div>
                  }
                  {/* Category badge */}
                  <div style={{
                    position: 'absolute', top: '12px', left: '12px',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    color: 'white', padding: '4px 10px', borderRadius: '20px',
                    fontSize: '12px', fontWeight: '600'
                  }}>
                    {venue.category}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    {venue.logo_url && (
                      <img src={venue.logo_url} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                    )}
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{venue.name}</h3>
                  </div>
                  {venue.tagline && (
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px', lineHeight: '1.4' }}>{venue.tagline}</p>
                  )}

                  {/* Tier prices */}
                  {venue.membership_tiers?.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                      {venue.membership_tiers.slice(0, 3).map(tier => (
                        <span key={tier.id} style={{
                          background: '#f3f4f6', padding: '4px 10px', borderRadius: '8px',
                          fontSize: '12px', fontWeight: '600', color: '#374151'
                        }}>
                          {tier.name} · ${(tier.price_cents / 100).toFixed(0)}/mo
                        </span>
                      ))}
                    </div>
                  )}

                  <button style={{
                    width: '100%', padding: '12px', background: accent, color: 'white',
                    border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                    cursor: 'pointer', fontFamily: font
                  }}>
                    View venue →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}