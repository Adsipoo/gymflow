'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

const CATEGORIES = [
  'Gym', 'Yoga Studio', 'Wellness Center', 'Pilates Studio',
  'Boxing Gym', 'CrossFit Box', 'PT Studio', 'Dance Studio',
  'Martial Arts', 'Swimming Center', 'Other'
]

const CLASS_TYPES = [
  'Yoga', 'HIIT', 'Spin', 'Boxing', 'CrossFit',
  'Meditation', 'Stretching', 'PT Session', 'Pilates'
]

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createSupabaseBrowser()

  const [path, setPath] = useState('')
  const [venue, setVenue] = useState({
    name: '', category: 'Gym', tagline: '', description: ''
  })
  const [images, setImages] = useState({
    logo: null, hero: null, logoPreview: '', heroPreview: ''
  })
  const [tiers, setTiers] = useState([
    { name: '', price: '', description: '', classTypes: [] }
  ])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log('Auth check result:', user)
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setAuthChecked(true)
      }
    })
  }, [])

  const totalSteps = path === 'owner' ? 5 : 3
  const progressPercent = (step / totalSteps) * 100

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf0 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
  }

  const cardStyle = {
    background: 'white',
    borderRadius: '24px',
    padding: '48px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
  }

  const progressBarStyle = {
    height: '4px',
    background: '#e5e7eb',
    borderRadius: '2px',
    marginBottom: '40px',
    overflow: 'hidden'
  }

  const progressFillStyle = {
    height: '100%',
    width: `${progressPercent}%`,
    background: '#007AFF',
    borderRadius: '2px',
    transition: 'width 0.3s ease'
  }

  const headingStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '8px',
    letterSpacing: '-0.5px'
  }

  const subheadingStyle = {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '32px'
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #e5e7eb',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '16px',
    fontFamily: 'inherit'
  }

  const btnPrimaryStyle = {
    width: '100%',
    padding: '16px',
    background: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontSize: '17px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px'
  }

  const btnSecondaryStyle = {
    background: 'none',
    border: 'none',
    color: '#007AFF',
    fontSize: '15px',
    cursor: 'pointer',
    marginTop: '12px',
    display: 'block',
    width: '100%',
    textAlign: 'center'
  }

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
              padding: '20px',
              borderRadius: '16px',
              border: `2px solid ${path === opt.value ? '#007AFF' : '#e5e7eb'}`,
              background: path === opt.value ? '#f0f7ff' : 'white',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
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
      <input
        style={inputStyle}
        placeholder="Venue name (e.g. Zen Flow Studio)"
        value={venue.name}
        onChange={e => setVenue({ ...venue, name: e.target.value })}
      />
      <select
        style={inputStyle}
        value={venue.category}
        onChange={e => setVenue({ ...venue, category: e.target.value })}
      >
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        style={inputStyle}
        placeholder="Tagline (e.g. Find your flow)"
        value={venue.tagline}
        onChange={e => setVenue({ ...venue, tagline: e.target.value })}
      />
      <textarea
        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
        placeholder="Description — tell clients what makes your venue special"
        value={venue.description}
        onChange={e => setVenue({ ...venue, description: e.target.value })}
      />
      <button
        style={btnPrimaryStyle}
        onClick={() => {
          if (!venue.name) return setError('Please enter a venue name')
          setError('')
          setStep(3)
        }}
      >
        Continue
      </button>
      {error && <p style={{ color: '#FF3B30', textAlign: 'center', marginTop: '12px' }}>{error}</p>}
      <button style={btnSecondaryStyle} onClick={() => setStep(1)}>Back</button>
    </>
  )

  const renderStep3Owner = () => (
    <>
      <h1 style={headingStyle}>Add some visuals</h1>
      <p style={subheadingStyle}>A great photo makes your venue stand out</p>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>
          Logo (optional)
        </label>
        <input type="file" accept="image/*" onChange={e => {
          const file = e.target.files[0]
          if (file) setImages({ ...images, logo: file, logoPreview: URL.createObjectURL(file) })
        }} />
        {images.logoPreview && (
          <img src={images.logoPreview} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', marginTop: '8px' }} />
        )}
      </div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>
          Hero image
        </label>
        <input type="file" accept="image/*" onChange={e => {
          const file = e.target.files[0]
          if (file) setImages({ ...images, hero: file, heroPreview: URL.createObjectURL(file) })
        }} />
        {images.heroPreview && (
          <img src={images.heroPreview} style={{ width: '100%', height: '200px', borderRadius: '12px', objectFit: 'cover', marginTop: '8px' }} />
        )}
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
        <input
          style={inputStyle}
          placeholder="Tier name (e.g. Basic, Premium, Unlimited)"
          value={tier.name}
          onChange={e => setTiers(tiers.map((t, j) => j === i ? { ...t, name: e.target.value } : t))}
        />
        <input
          style={inputStyle}
          placeholder="Monthly price (e.g. 29)"
          type="number"
          value={tier.price}
          onChange={e => setTiers(tiers.map((t, j) => j === i ? { ...t, price: e.target.value } : t))}
        />
        <input
          style={inputStyle}
          placeholder="Description (e.g. Great for beginners)"
          value={tier.description}
          onChange={e => setTiers(tiers.map((t, j) => j === i ? { ...t, description: e.target.value } : t))}
        />
      </div>
    ))}
    {tiers.length < 5 && (
      <button
        onClick={() => setTiers([...tiers, { name: '', price: '', description: '', classTypes: [] }])}
        style={{ ...btnSecondaryStyle, border: '1.5px dashed #007AFF', borderRadius: '12px', padding: '14px', marginBottom: '8px' }}
      >
        + Add another tier
      </button>
    )}
    <button
      style={btnPrimaryStyle}
      onClick={() => {
        const invalid = tiers.some(t => !t.name || !t.price)
        if (invalid) return setError('Please fill in name and price for all tiers')
        setError('')
        setStep(5)
      }}
    >
      Continue
    </button>
    {error && <p style={{ color: '#FF3B30', textAlign: 'center', marginTop: '12px' }}>{error}</p>}
    <button style={btnSecondaryStyle} onClick={() => setStep(3)}>Back</button>
  </>
)

  const renderStep5Owner = () => (
    <>
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
    </>
  )

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
          name: venue.name,
          tagline: venue.tagline,
          description: venue.description,
          category: venue.category,
          slug,
          owner_id: user.id,
          logo_url: logoUrl,
          hero_image_url: heroUrl
        })
        .select()
        .single()

      if (gymError) throw gymError

      for (const tier of tiers) {
        const { data: tierData, error: tierError } = await supabase
          .from('membership_tiers')
          .insert({
            gym_id: gymData.id,
            name: tier.name,
            price_cents: Math.round(parseFloat(tier.price) * 100),
            description: tier.description
          })
          .select()
          .single()

        if (tierError) throw tierError

        if (tier.classTypes.length > 0) {
          await supabase.from('tier_class_types').insert(
            tier.classTypes.map(ct => ({ tier_id: tierData.id, class_type: ct }))
          )
        }
      }

      await supabase
        .from('profiles')
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

  const renderStep = () => {
    if (step === 1) return renderStep1()
    if (path === 'owner') {
      if (step === 2) return renderStep2Owner()
      if (step === 3) return renderStep3Owner()
      if (step === 4) return renderStep4Owner()
      if (step === 5) return renderStep5Owner()
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
        {step > 1 && (
          <div style={progressBarStyle}>
            <div style={progressFillStyle} />
          </div>
        )}
        {renderStep()}
      </div>
    </div>
  )
}