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

const labelStyle = {
  color: '#8E8E93', fontSize: 12, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.3,
}

export default function AdminBrandingPage() {
  const { gym, supabase } = useUser()
  const [name, setName] = useState(gym?.name || '')
  const [tagline, setTagline] = useState(gym?.tagline || '')
  const [theme, setTheme] = useState(gym?.theme || 'clean')
  const [trialDays, setTrialDays] = useState(gym?.trial_days ?? 7)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const directLink = gym?.slug
    ? `${window.location.origin}/join/${gym.slug}`
    : null

  const handleCopy = () => {
    if (!directLink) return
    navigator.clipboard.writeText(directLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!gym?.id) return
    setSaving(true)
    await supabase.from('gyms').update({
      name, tagline, theme, trial_days: trialDays,
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
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>Branding</h1>
          <p style={{ color: '#8E8E93', fontSize: 14, margin: 0 }}>Customise your venue's look, feel and settings</p>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          background: saved ? '#34C759' : '#007AFF',
          color: '#fff', border: 'none',
          padding: '10px 20px', borderRadius: 12, fontSize: 14,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: saving ? 0.6 : 1,
        }}>
          {saved ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: currentTheme.colors[0] }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: currentTheme.colors[0], letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 }}>Preview</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{name || 'Your Venue Name'}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>Welcome back</div>
        <div style={{ fontSize: 14, color: '#8E8E93' }}>{tagline || 'Your tagline here'}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: currentTheme.colors[0], color: '#fff', fontSize: 13, fontWeight: 600 }}>Book Class</div>
          <div style={{ padding: '8px 16px', borderRadius: 10, background: currentTheme.colors[0] + '10', color: currentTheme.colors[0], fontSize: 13, fontWeight: 600 }}>View Schedule</div>
        </div>
      </div>

      {/* Direct Join Link */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', margin: '0 0 4px' }}>Direct Join Link</h3>
        <p style={{ color: '#8E8E93', fontSize: 13, margin: '0 0 16px' }}>
          Share this link with new members — it takes them straight to your venue's signup page. Perfect for your Instagram bio, email footer, or flyers.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, padding: '12px 14px', borderRadius: 12,
            background: '#F2F2F7', fontSize: 13, color: '#3A3A3C',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {directLink || 'No slug set'}
          </div>
          <button onClick={handleCopy} style={{
            background: copied ? '#34C759' : '#007AFF',
            color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: 12, fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            flexShrink: 0, transition: 'background 0.2s',
          }}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        {gym?.invite_code && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#F2F2F7', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3 }}>Invite Code</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E', letterSpacing: 2, marginTop: 2 }}>{gym.invite_code}</div>
            </div>
            <button onClick={() => navigator.clipboard.writeText(gym.invite_code)} style={{
              background: '#007AFF10', border: 'none', color: '#007AFF',
              padding: '6px 14px', borderRadius: 8, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Copy</button>
          </div>
        )}
      </div>

      {/* Venue Details */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', margin: '0 0 16px' }}>Venue Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Venue Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter venue name" style={{ ...inputStyle, marginTop: 6 }} />
          </div>
          <div>
            <label style={labelStyle}>Tagline</label>
            <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="A short description for your venue" style={{ ...inputStyle, marginTop: 6 }} />
          </div>
        </div>
      </div>

      {/* Membership Settings */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', margin: '0 0 4px' }}>Membership Settings</h3>
        <p style={{ color: '#8E8E93', fontSize: 13, margin: '0 0 16px' }}>Configure defaults for new members joining your venue</p>
        <div>
          <label style={labelStyle}>Free Trial Period</label>
          <p style={{ color: '#8E8E93', fontSize: 12, margin: '2px 0 8px' }}>How many days new members get free before their subscription starts</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="number" min={0} max={90} value={trialDays}
              onChange={e => setTrialDays(parseInt(e.target.value) || 0)}
              style={{ ...inputStyle, width: 100 }} />
            <span style={{ color: '#8E8E93', fontSize: 14, fontWeight: 500 }}>days</span>
            {trialDays === 0 && (
              <span style={{ fontSize: 12, color: '#FF9500', fontWeight: 600, background: '#FF950010', padding: '4px 10px', borderRadius: 8 }}>No trial</span>
            )}
            {trialDays > 0 && (
              <span style={{ fontSize: 12, color: '#34C759', fontWeight: 600, background: '#34C75910', padding: '4px 10px', borderRadius: 8 }}>{trialDays}-day free trial</span>
            )}
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', margin: '0 0 16px' }}>Theme</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} style={{
              background: theme === t.id ? t.colors[0] + '08' : '#F2F2F7',
              border: '2px solid ' + (theme === t.id ? t.colors[0] : 'transparent'),
              borderRadius: 14, padding: 16, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'center',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
                {t.colors.map((c, i) => (
                  <div key={i} style={{ width: 20, height: 20, borderRadius: 6, background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
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