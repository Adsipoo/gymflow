'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

const CATEGORIES = [
  'Gym', 'Yoga Studio', 'Wellness Center', 'Pilates Studio',
  'Boxing Gym', 'CrossFit Box', 'PT Studio', 'Dance Studio',
  'Martial Arts', 'Swimming Center', 'Other'
]

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createSupabaseBrowser()

  // Owner state
  const [path, setPath] = useState('')
  const [venue, setVenue] = useState({ name: '', category: 'Gym', tagline: '', description: '' })
  const [images, setImages] = useState({ logo: null, hero: null, logoPreview: '', heroPreview: '' })
  const [tiers, setTiers] = useState([{ name: '', price: '', description: '' }])

  // Member state
  const [inviteCode, setInviteCode] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [venueTiers, setVenueTiers] = useState([])
  const [selectedTier, setSelectedTier] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else { setUser(user); setAuthChecked(true) }
    })
  }, [])

  const totalSteps = path === 'owner' ? 5 : 3
  const progressPercent = (step / totalSteps) * 100

  // Styles
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf0 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
  }
  const cardStyle = {
    background: 'white', borderRadius: '24px', padding: '48px',
    width: '100%', maxWidth: '560px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
  }
  const progressBarStyle = {
    height: '4px', background: '#e5e7eb', borderRadius: '2px',
    marginBottom: '40px', overflow: 'hidden'
  }
  const progressFillStyle = {
    height: '100%', width: `${progressPercent}%`, background: '#007AFF',
    borderRadius: '2px', transition: 'width 0.3s ease'
  }
  const headingStyle = {
    fontSize: '28px', fontWeight: '700', color: '#1a1a1a',
    marginBottom: '8px', letterSpacing: '-0.5px'
  }
  const subheadingStyle = {
    fontSize: '16px', color: '#6b7280', marginBottom: '32px'
  }
  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '1.5px solid #e5e7eb', fontSize: '16px', outline: 'none',
    boxSizing: 'border-box', marginBottom: '16px', fontFamily: 'inherit'
  }
  const btnPrimaryStyle = {
    width: '100%', padding: '16px', background: '#007AFF', color: 'white',
    border: 'none', borderRadius: '14px', fontSize: '17px', fontWeight: '600',
    cursor: 'pointer', marginTop: '8px'
  }
  const btnSecondaryStyle = {
    background: 'none', border: 'none', color: '#007AFF', fontSize: '15px',
    cursor: 'pointer', marginTop: '12px', display: 'block',
    width: '100%', textAlign: 'center'
  }

  // Member handlers
  const handleSearch = async (query, category) => {
    setSearchLoading(true)
    let q = supabase.from('gyms').select('*')
    if (query) q = q.ilike('name', `%${query}%`)
    if (category && category !== 'All') q = q.eq('category', category)
    const { data } = await q.limit(10)
    setSearchResults(data || [])
    setSearchLoading(false)
  }

  const handleInviteCode = async () => {
    setSearchLoading(true)
    setInviteError('')
    const { data, error } = await supabase
      .from('gyms').select('*')
      .eq('invite_code', inviteCode).single()
    if (error || !data) {
      setInviteError('Invalid invite code. Please try again.')
      setSearchLoading(false)
      return
    }
    setSelectedVenue(data)
    await loadVenueTiers(data.id)
    setStep(3)
    setSearchLoading(false)
  }

  const loadVenueTiers = async (gymId) => {
    const { data } = await supabase
      .from('membership_tiers').select('*')
      .eq('gym_id', gymId).eq('is_active', true)
    setVenueTiers(data || [])
  }

  const handleMemberCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: selectedTier.id,
          gymId: selectedVenue.id,
          userId: user.id
        })
      })
      const { url, error: apiError } = await res.json()
      if (apiError) throw new Error(apiError)
      window.location.href = url
    } catch (err) {
      setError('Could not start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Owner save
  const handleSaveOwner = async () => {
    setLoading(true)
    setError('')
    try {
      let logoUrl = null
      let heroUrl = null
      const slug = venue.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      if (images.logo) {
        const { data, error } = await supabase.storage
          .from('gym-images')
          .upload(`${slug}/logo-${Date.now()}`, images.logo, { upsert: true })
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('gym-images').getPublicUrl(data.path)
          logoUrl = publicUrl
        }
      }
      if (images.hero) {
        const { data, error } = await supabase.storage
          .from('gym-images')
          .upload(`${slug}/hero-${Date.now()}`, images.hero, { upsert: true })
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('gym-images').getPublicUrl(data.path)
          heroUrl = publicUrl
        }
      }

      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: venue.name, tagline: venue.tagline,
          description: venue.description, category: venue.category,
          slug, owner_id: user.id, logo_url: logoUrl, hero_image_url: heroUrl
        })
        .select().single()

      if (gymError) throw gymError

      for (const tier of tiers) {
        const { data: tierData, error: tierError } = await supabase
          .from('membership_tiers')
          .insert({
            gym_id: gymData.id, name: tier.name,
            price_cents: Math.round(parseFloat(tier.price) * 100),
            description: tier.description
          })
          .select().single()
        if (tierError) throw tierError
      }

      await supabase.from('profiles')
        .update({ role: 'owner', onboarding_complete: true })
        .eq('id', user.id)

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step renderers
  const renderStep1 = () => (
    <>
      <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '40px' }}>👋</div>
      <h1 style={{ ...headingStyle, textAlign: 'center' }}>Welcome to Humanitix Wellness</h1>
      <p style={{ ...subheadingStyle, textAlign: 'center' }}>What brings you here today?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { value: 'owner', emoji: '🏋️', title: 'I run a venue', sub: 'Set up your gym, studio or wellness center' },
          { value: 'member', emoji: '💪', title: 'I want to join a venue', sub: 'Find a gym or studio near you' }
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => { setPath(opt.value); setStep(2) }}
            style={{
              padding: '20px', borderRadius: '16px', cursor: 'pointer',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px',
              border: `2px solid ${path === opt.value ? '#007AFF' : '#e5e7eb'}`,
              background: path === opt.value ? '#f0f7ff' : 'white'
            }}
          >
            <span style={{ fontSize: '32px' }}>{opt.emoji}</span>
            <div>
              <div style={{ fontWeight: '600', fontSize: '17px', color: '#1a1a1a' }}>{opt.title}</div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '2px' }}>{opt.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  )

  const renderStep2Owner = () => (
    <>
      <h1 style={headingStyle}>Tell us about your venue</h1>
      <p style={subheadingStyle}>This is what clients will see when they find you</p>
      <input style={inputStyle} placeholder="Venue name (e.g. Zen Flow Studio)"
        value={venue.name} onChange={e => setVenue({ ...venue, name: e.target.value })} />
      <select style={inputStyle} value={venue.category}
        onChange={e => setVenue({ ...venue, category: e.target.value })}>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input style={inputStyle} placeholder="Tagline (e.g. Find your flow)"
        value={venue.tagline} onChange={e => setVenue({ ...venue, tagline: e.target.value })} />
      <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
        placeholder="Description — tell clients what makes your venue special"
        value={venue.description} onChange={e => setVenue({ ...venue, description: e.target.value })} />
      <button style={btnPrimaryStyle} onClick={() => {
        if (!venue.name) return setError('Please enter a venue name')
        setError(''); setStep(3)
      }}>Continue</button>
      {error && <p style={{ color: '#FF3B30', textAlign: 'center', marginTop: '12px' }}>{error}</p>}
      <button style={btnSecondaryStyle} onClick={() => setStep(1)}>Back</button>
    </>
  )

  const renderStep3Owner = () => (
    <>
      <h1 style={headingStyle}>Add some visuals</h1>
      <p style={subheadingStyle}>A great photo makes your venue stand out</p>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>Logo (optional)</label>
        <input type="file" accept="image/*" onChange={e => {
          const file = e.target.files[0]
          if (file) setImages({ ...images, logo: file, logoPreview: URL.createObjectURL(file) })
        }} />
        {images.logoPreview && <img src={images.logoPreview} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', marginTop: '8px' }} />}
      </div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>Hero image</label>
        <input type="file" accept="image/*" onChange={e => {
          const file = e.target.files[0]
          if (file) setImages({ ...images, hero: file, heroPreview: URL.createObjectURL(file) })
        }} />
        {images.heroPreview && <img src={images.heroPreview} style={{ width: '100%', height: '200px', borderRadius: '12px', objectFit: 'cover', marginTop: '8px' }} />}
      </div>
      <button style={btnPrimaryStyle} onClick={() => setStep(4)}>Continue</button>
      <button style={btnSecondaryStyle} onClick={() => setStep(2)}>Back</button>
    </>
  )

  const renderStep4Owner = () => (
    <>
      <h1 style={headingStyle}>Create membership tiers</h1>
      <p style={subheadingStyle}>Define what your clients can access and at what price</p>
      {tiers.map((tier, i) => (
        <div key={i} style={{ background: '#f9fafb', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: '600', color: '#1a1a1a' }}>Tier {i + 1}</span>
            {tiers.length > 1 && (
              <button onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', fontSize: '14px' }}>
                Remove
              </button>
            )}
          </div>
          <input style={inputStyle} placeholder="Tier name (e.g. Basic, Premium, Unlimited)"
            value={tier.name} onChange={e => setTiers(tiers.map((t, j) => j === i ? { ...t, name: e.target.value } : t))} />
          <input style={inputStyle} placeholder="Monthly price (e.g. 29)" type="number"
            value={tier.price} onChange={e => setTiers(tiers.map((t, j) => j === i ? { ...t, price: e.target.value } : t))} />
          <input style={inputStyle} placeholder="Description (e.g. Great for beginners)"
            value={tier.description} onChange={e => setTiers(tiers.map((t, j) => j === i ? { ...t, description: e.target.value } : t))} />
        </div>
      ))}
      {tiers.length < 5 && (
        <button onClick={() => setTiers([...tiers, { name: '', price: '', description: '' }])}
          style={{ ...btnSecondaryStyle, border: '1.5px dashed #007AFF', borderRadius: '12px', padding: '14px', marginBottom: '8px' }}>
          + Add another tier
        </button>
      )}
      <button style={btnPrimaryStyle} onClick={() => {
        const invalid = tiers.some(t => !t.name || !t.price)
        if (invalid) return setError('Please fill in name and price for all tiers')
        setError(''); setStep(5)
      }}>Continue</button>
      {error && <p style={{ color: '#FF3B30', textAlign: 'center', marginTop: '12px' }}>{error}</p>}
      <button style={btnSecondaryStyle} onClick={() => setStep(3)}>Back</button>
    </>
  )

  const renderStep5Owner = () => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎉</div>
      <h1 style={headingStyle}>You're all set!</h1>
      <p style={subheadingStyle}>Ready to launch {venue.name}?</p>
      <div style={{ background: '#f9fafb', borderRadius: '16px', padding: '20px', textAlign: 'left', marginBottom: '24px' }}>
        <div style={{ fontWeight: '600', marginBottom: '8px' }}>{venue.name}</div>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>{venue.category} · {venue.tagline}</div>
        <div style={{ marginTop: '12px', fontSize: '14px', color: '#374151' }}>
          {tiers.length} membership tier{tiers.length > 1 ? 's' : ''} created
        </div>
      </div>
      <button style={btnPrimaryStyle} onClick={handleSaveOwner} disabled={loading}>
        {loading ? 'Setting up your venue...' : 'Launch my venue 🚀'}
      </button>
      {error && <p style={{ color: '#FF3B30', textAlign: 'center', marginTop: '12px' }}>{error}</p>}
    </div>
  )

  const renderStep2Member = () => (
    <>
      <h1 style={headingStyle}>Find your venue</h1>
      <p style={subheadingStyle}>Search for a venue or enter an invite code</p>

      {/* Invite code */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>
          Have an invite code?
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
          />
          <button onClick={handleInviteCode} disabled={!inviteCode || searchLoading}
            style={{
              padding: '14px 20px', background: '#007AFF', color: 'white',
              border: 'none', borderRadius: '12px', fontWeight: '600',
              cursor: 'pointer', fontSize: '15px', whiteSpace: 'nowrap'
            }}>
            {searchLoading ? '...' : 'Join'}
          </button>
        </div>
        {inviteError && <p style={{ color: '#FF3B30', fontSize: '13px', marginTop: '8px' }}>{inviteError}</p>}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        <span style={{ color: '#9ca3af', fontSize: '13px' }}>or search the directory</span>
        <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {['All', ...CATEGORIES].map(cat => (
          <button key={cat}
            onClick={() => { setCategoryFilter(cat); handleSearch(searchQuery, cat) }}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer', border: '1.5px solid',
              borderColor: categoryFilter === cat ? '#007AFF' : '#e5e7eb',
              background: categoryFilter === cat ? '#f0f7ff' : 'white',
              color: categoryFilter === cat ? '#007AFF' : '#6b7280'
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <input style={inputStyle} placeholder="Search by name or location..."
        value={searchQuery}
        onChange={e => { setSearchQuery(e.target.value); handleSearch(e.target.value, categoryFilter) }} />

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
        {searchResults.map(v => (
          <button key={v.id}
            onClick={async () => { setSelectedVenue(v); await loadVenueTiers(v.id); setStep(3) }}
            style={{
              padding: '16px', borderRadius: '16px', border: '1.5px solid #e5e7eb',
              background: 'white', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: '16px'
            }}>
            {v.hero_image_url
              ? <img src={v.hero_image_url} style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏋️</div>
            }
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a' }}>{v.name}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{v.category} · {v.tagline}</div>
            </div>
          </button>
        ))}
        {searchResults.length === 0 && searchQuery.length > 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', padding: '20px' }}>No venues found</p>
        )}
      </div>
      <button style={btnSecondaryStyle} onClick={() => setStep(1)}>Back</button>
    </>
  )

  const renderStep3Member = () => (
    <>
      {selectedVenue && (
        <>
          {selectedVenue.hero_image_url && (
            <img src={selectedVenue.hero_image_url}
              style={{ width: '100%', height: '180px', borderRadius: '16px', objectFit: 'cover', marginBottom: '20px' }} />
          )}
          <h1 style={{ ...headingStyle, marginBottom: '4px' }}>{selectedVenue.name}</h1>
          <p style={{ fontSize: '14px', color: '#007AFF', fontWeight: '600', marginBottom: '8px' }}>{selectedVenue.category}</p>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.5' }}>{selectedVenue.description}</p>

          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', marginBottom: '12px' }}>Choose a plan</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {venueTiers.map(tier => (
              <button key={tier.id} onClick={() => setSelectedTier(tier)}
                style={{
                  padding: '20px', borderRadius: '16px', cursor: 'pointer', textAlign: 'left',
                  border: `2px solid ${selectedTier?.id === tier.id ? '#007AFF' : '#e5e7eb'}`,
                  background: selectedTier?.id === tier.id ? '#f0f7ff' : 'white'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a1a' }}>{tier.name}</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: '#007AFF' }}>
                    ${(tier.price_cents / 100).toFixed(0)}<span style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>/mo</span>
                  </span>
                </div>
                {tier.description && <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>{tier.description}</p>}
              </button>
            ))}
          </div>

          {selectedVenue.trial_days > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '14px', marginBottom: '20px', textAlign: 'center' }}>
              <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                🎉 {selectedVenue.trial_days}-day free trial — cancel anytime before being charged
              </span>
            </div>
          )}

          <button
            style={{ ...btnPrimaryStyle, opacity: selectedTier ? 1 : 0.5 }}
            disabled={!selectedTier || loading}
            onClick={handleMemberCheckout}>
            {loading ? 'Setting up...' : `Start ${selectedVenue.trial_days > 0 ? 'free trial' : 'membership'}`}
          </button>
          {error && <p style={{ color: '#FF3B30', textAlign: 'center', marginTop: '12px' }}>{error}</p>}
          <button style={btnSecondaryStyle} onClick={() => setStep(2)}>Back</button>
        </>
      )}
    </>
  )

  const renderStep = () => {
    if (step === 1) return renderStep1()
    if (path === 'owner') {
      if (step === 2) return renderStep2Owner()
      if (step === 3) return renderStep3Owner()
      if (step === 4) return renderStep4Owner()
      if (step === 5) return renderStep5Owner()
    }
    if (path === 'member') {
      if (step === 2) return renderStep2Member()
      if (step === 3) return renderStep3Member()
    }
    return null
  }

  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf0 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#8E8E93', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {step > 1 && <div style={progressBarStyle}><div style={progressFillStyle} /></div>}
        {renderStep()}
      </div>
    </div>
  )
}