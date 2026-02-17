'use client'

import { useState } from 'react'
import { useUser } from '../layout'

const THEMES = [
  { id: 'clean', name: 'Clean', desc: 'Minimal and modern', colors: ['#007AFF', '#F2F2F7', '#FFFFFF'] },
  { id: 'dark', name: 'Dark', desc: 'Bold and sleek', colors: ['#0A84FF', '#1C1C1E', '#2C2C2E'] },
  { id: 'energy', name: 'Energy', desc: 'Vibrant and intense', colors: ['#FF3B30', '#FFF5F5', '#FFFFFF'] },
  { id: 'nature', name: 'Nature', desc: 'Calm and grounded', colors: ['#34C759', '#F0FAF3', '#FFFFFF'] },
  { id: 'luxury', name: 'Luxury', desc: 'Premium and refined', colors: ['#AF52DE', '#F9F5FC', '#FFFFFF'] },
  { id: 'sunset', name: 'Sunset', desc: 'Warm and welcoming', colors: ['#FF9500', '#FFF8F0', '#FFFFFF'] },
]

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
  color: '#1C1C1E', fontSize: 14, outline: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
  boxSizing: 'border-box',
}

export default function AdminBrandingPage() {
  const { gym, supabase } = useUser()
  const [name, setName] = useState(gym?.name || '')
  const [tagline, setTagline] = useState(gym?.tagline || '')
  const [theme, setTheme] = useState(gym?.theme || 'clean')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!gym?.id) return
    setSaving(true)
    await supabase.from('gyms').update({
      name,
      tagline,
      theme,
    }).eq('id', gym.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0]

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>
            Branding
          </h1>
          <p style={{ color: '#8E8E93', fontSize: 14, margin: 0 }}>
            Customise your gym's look and feel
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saved ? '#34C759' : '#007AFF',
            color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 12, fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saved ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Saved
            </>
          ) : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Preview Card */}
      <div style={{
        background: currentTheme.colors[2], borderRadius: 16, padding: 24,
        border: '2px solid ' + currentTheme.colors[0] + '20',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: currentTheme.colors[0],
        }} />
        <div style={{
          fontSize: 11, fontWeight: 700, color: currentTheme.colors[0],
          letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, marginTop: 8,
        }}>
          Preview
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
          {name || 'Your Gym Name'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>
          Welcome back
        </div>
        <div style={{ fontSize: 14, color: '#8E8E93' }}>
          {tagline || 'Your tagline here'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <div style={{
            padding: '8px 16px', borderRadius: 10,
            background: currentTheme.colors[0], color: '#fff',
            fontSize: 13, fontWeight: 600,
          }}>
            Book Class
          </div>
          <div style={{
            padding: '8px 16px', borderRadius: 10,
            background: currentTheme.colors[0] + '10',
            color: currentTheme.colors[0],
            fontSize: 13, fontWeight: 600,
          }}>
            View Schedule
          </div>
        </div>
      </div>

      {/* Gym Details */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', margin: '0 0 16px' }}>
          Gym Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Gym Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter gym name"
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </div>
          <div>
            <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="A short description for your gym"
              style={{ ...inputStyle, marginTop: 6 }}
            />
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', margin: '0 0 16px' }}>
          Theme
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                background: theme === t.id ? t.colors[0] + '08' : '#F2F2F7',
                border: '2px solid ' + (theme === t.id ? t.colors[0] : 'transparent'),
                borderRadius: 14, padding: 16, cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
                {t.colors.map((c, i) => (
                  <div key={i} style={{
                    width: 20, height: 20, borderRadius: 6,
                    background: c, border: '1px solid rgba(0,0,0,0.1)',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{t.name}</div>
              <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
