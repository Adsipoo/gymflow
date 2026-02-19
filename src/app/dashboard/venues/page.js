'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../layout'
import { useRouter } from 'next/navigation'

const categories = ['All', 'Gym', 'Yoga Studio', 'Wellness Center', 'Pilates Studio', 'Boxing Gym', 'CrossFit Box', 'PT Studio', 'Dance Studio', 'Martial Arts', 'Swimming Center', 'Other']

export default function VenuesPage() {
  const { profile, supabase } = useUser()
  const router = useRouter()
  const [venues, setVenues] = useState([])
  const [myGymIds, setMyGymIds] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    async function load() {
      const [venueRes, membershipRes] = await Promise.all([
        supabase.from('gyms').select('id, name, tagline, category, slug, logo_url, hero_image_url'),
        supabase.from('gym_memberships').select('gym_id').eq('member_id', profile.id).in('status', ['active', 'trialing']),
      ])
      setVenues(venueRes.data || [])
      setMyGymIds((membershipRes.data || []).map(m => m.gym_id))
      setLoading(false)
    }
    load()
  }, [profile])

  const handleInviteCode = async () => {
    if (!inviteCode.trim()) return
    setInviteLoading(true)
    setInviteError('')
    const { data } = await supabase
      .from('gyms')
      .select('slug')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single()
    setInviteLoading(false)
    if (!data) { setInviteError('Invalid invite code. Please check and try again.'); return }
    router.push(`/dashboard/venues/${data.slug}`)
  }

  const filtered = venues.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || v.category === category
    return matchSearch && matchCat
  })

  if (loading) return <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>Loading...</div>

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>Find a Venue</h1>
      <p style={{ color: '#8E8E93', fontSize: 14, margin: '0 0 24px' }}>Discover and join wellness venues near you</p>

      {/* Invite Code */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 20,
        border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', marginBottom: 10 }}>Have an invite code?</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleInviteCode()}
            placeholder="Enter code e.g. SAC2024"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
              fontSize: 14, color: '#1C1C1E', outline: 'none',
              fontFamily: 'inherit', letterSpacing: 1,
            }}
          />
          <button onClick={handleInviteCode} disabled={inviteLoading} style={{
            background: '#007AFF', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 10, fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {inviteLoading ? '...' : 'Join'}
          </button>
        </div>
        {inviteError && <p style={{ color: '#FF3B30', fontSize: 12, margin: '8px 0 0' }}>{inviteError}</p>}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search venues..."
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.08)', background: '#FFFFFF',
          fontSize: 14, color: '#1C1C1E', outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      />

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            background: category === c ? '#007AFF' : '#FFFFFF',
            color: category === c ? '#fff' : '#3A3A3C',
            border: '1px solid ' + (category === c ? '#007AFF' : 'rgba(0,0,0,0.08)'),
            padding: '6px 14px', borderRadius: 20, fontSize: 13,
            fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>{c}</button>
        ))}
      </div>

      {/* Venue Cards */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#8E8E93' }}>No venues found</div>
      )}

      {filtered.map(v => {
        const isMember = myGymIds.includes(v.id)
        return (
          <div key={v.id} onClick={() => router.push(`/dashboard/venues/${v.slug}`)}
            style={{
              background: '#FFFFFF', borderRadius: 16, marginBottom: 12,
              border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer',
            }}
          >
            {v.hero_image_url && (
              <div style={{ height: 120, overflow: 'hidden' }}>
                <img src={v.hero_image_url} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {v.logo_url && (
                  <img src={v.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
                )}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{v.name}</div>
                  <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{v.category} {v.tagline ? '· ' + v.tagline : ''}</div>
                </div>
              </div>
              {isMember ? (
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#34C759',
                  background: '#34C75914', padding: '4px 10px', borderRadius: 8,
                }}>Member</span>
              ) : (
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#007AFF',
                  background: '#007AFF14', padding: '4px 10px', borderRadius: 8,
                }}>View →</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}