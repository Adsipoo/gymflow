'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../layout'

const BASE_AUDIENCES = [
  { id: 'all', label: 'All members', desc: 'Everyone with a membership at your venue', color: '#007AFF' },
  { id: 'active', label: 'Active only', desc: 'Members with a paid active subscription', color: '#34C759' },
  { id: 'trialing', label: 'Trialing only', desc: 'Members currently on a free trial', color: '#FF9500' },
  { id: 'tiers', label: 'Specific tiers', desc: 'Choose one or more membership tiers', color: '#5856D6' },
]

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
  color: '#1C1C1E', fontSize: 14, outline: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
  boxSizing: 'border-box',
}
const labelStyle = { color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }

export default function NotificationsPage() {
  const { gym, supabase } = useUser()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [tiers, setTiers] = useState([])
  const [selectedTiers, setSelectedTiers] = useState([])
  const [memberCount, setMemberCount] = useState(null)
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  // Load tiers
  useEffect(() => {
    if (!gym?.id) return
    supabase.from('membership_tiers').select('*').eq('gym_id', gym.id).eq('is_active', true)
      .then(({ data }) => setTiers(data || []))
  }, [gym?.id])

  // Fetch member count for selected audience
  useEffect(() => {
    if (!gym?.id) return
    if (audience === 'tiers' && selectedTiers.length === 0) { setMemberCount(0); return }
    async function fetchCount() {
      setMemberCount(null)
      let query = supabase
        .from('gym_memberships')
        .select('member_id', { count: 'exact', head: true })
        .eq('gym_id', gym.id)
      if (audience === 'active') query = query.eq('status', 'active')
      else if (audience === 'trialing') query = query.eq('status', 'trialing')
      else if (audience === 'tiers') query = query.in('tier_id', selectedTiers)
      const { count } = await query
      setMemberCount(count || 0)
    }
    fetchCount()
  }, [audience, selectedTiers, gym?.id])

  const toggleTier = (tid) => setSelectedTiers(prev => prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid])

  const canSend = subject.trim() && message.trim() && (audience !== 'tiers' || selectedTiers.length > 0)
  const selectedAudience = BASE_AUDIENCES.find(a => a.id === audience)

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: gym.id,
          gymName: gym.name,
          subject: subject.trim(),
          message: message.trim(),
          audience,
          tierIds: audience === 'tiers' ? selectedTiers : [],
        }),
      })
      const data = await res.json()
      setResult(data)
      if (!data.error) { setSubject(''); setMessage(''); setPreview(false) }
    } catch (err) {
      setResult({ error: err.message })
    }
    setSending(false)
  }

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>Notifications</h1>
      <p style={{ color: '#8E8E93', fontSize: 14, margin: '0 0 28px' }}>Send an email to your members</p>

      {/* Result banner */}
      {result && (
        <div style={{
          borderRadius: 14, padding: '14px 18px', marginBottom: 20,
          background: result.error ? '#FF3B3010' : '#34C75910',
          border: '1px solid ' + (result.error ? '#FF3B3030' : '#34C75930'),
          color: result.error ? '#FF3B30' : '#34C759',
          fontSize: 14, fontWeight: 600,
        }}>
          {result.error
            ? 'Error: ' + result.error
            : `✅ Sent to ${result.sent} member${result.sent !== 1 ? 's' : ''}${result.failed > 0 ? ` (${result.failed} failed)` : ''}`
          }
        </div>
      )}

      {/* Audience picker */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', margin: '0 0 4px' }}>Audience</h3>
        <p style={{ color: '#8E8E93', fontSize: 13, margin: '0 0 16px' }}>Who should receive this email?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BASE_AUDIENCES.map(a => {
            const selected = audience === a.id
            return (
              <div key={a.id}>
                <button onClick={() => setAudience(a.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                  border: selected ? '2px solid ' + a.color : '2px solid rgba(0,0,0,0.08)',
                  background: selected ? a.color + '08' : '#F2F2F7',
                  fontFamily: 'inherit', textAlign: 'left',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: selected ? a.color : '#fff',
                    border: selected ? 'none' : '2px solid #C7C7CC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1C1C1E', fontSize: 14 }}>{a.label}</div>
                    <div style={{ color: '#8E8E93', fontSize: 12, marginTop: 1 }}>{a.desc}</div>
                  </div>
                  {selected && a.id !== 'tiers' && memberCount !== null && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: a.color, background: a.color + '15', padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>
                      {memberCount} member{memberCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>

                {/* Tier checkboxes — shown when "Specific tiers" is selected */}
                {a.id === 'tiers' && selected && (
                  <div style={{ marginTop: 8, marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tiers.length === 0 ? (
                      <div style={{ color: '#8E8E93', fontSize: 13, padding: '8px 0' }}>No tiers found for your venue.</div>
                    ) : tiers.map(tier => {
                      const checked = selectedTiers.includes(tier.id)
                      return (
                        <button key={tier.id} onClick={() => toggleTier(tier.id)} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                          border: checked ? '2px solid #5856D6' : '2px solid rgba(0,0,0,0.08)',
                          background: checked ? '#5856D608' : '#F2F2F7',
                          fontFamily: 'inherit', textAlign: 'left',
                        }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            background: checked ? '#5856D6' : '#fff',
                            border: checked ? 'none' : '2px solid #C7C7CC',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#1C1C1E', fontSize: 14 }}>{tier.name}</div>
                            <div style={{ color: '#8E8E93', fontSize: 12 }}>${(tier.price_cents / 100).toFixed(2)}/mo</div>
                          </div>
                        </button>
                      )
                    })}
                    {selectedTiers.length > 0 && memberCount !== null && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#5856D6', padding: '4px 2px' }}>
                        {memberCount} member{memberCount !== 1 ? 's' : ''} in selected tier{selectedTiers.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Compose */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', margin: '0 0 16px' }}>Message</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Studio closed this Friday"
              style={{ ...inputStyle, marginTop: 6 }} />
          </div>
          <div>
            <label style={labelStyle}>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              style={{ ...inputStyle, marginTop: 6, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => setPreview(true)} disabled={!canSend} style={{
          flex: 1, padding: 16, borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)',
          background: '#F2F2F7', color: canSend ? '#1C1C1E' : '#C7C7CC',
          fontSize: 15, fontWeight: 600, cursor: canSend ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
        }}>Preview</button>
        <button onClick={handleSend} disabled={!canSend || sending} style={{
          flex: 2, padding: 16, borderRadius: 14, border: 'none',
          background: canSend ? '#007AFF' : '#C7C7CC',
          color: '#fff', fontSize: 15, fontWeight: 600,
          cursor: canSend && !sending ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
        }}>
          {sending ? 'Sending...' : `Send to ${memberCount !== null ? memberCount + ' member' + (memberCount !== 1 ? 's' : '') : '...'}`}
        </button>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div onClick={() => setPreview(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: 20,
            maxWidth: 500, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ background: '#F2F2F7', padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Email Preview</div>
              <div style={{ fontSize: 13, color: '#3A3A3C' }}>
                <strong>To:</strong> {audience === 'tiers'
                  ? tiers.filter(t => selectedTiers.includes(t.id)).map(t => t.name).join(', ')
                  : selectedAudience?.label
                } ({memberCount} member{memberCount !== 1 ? 's' : ''})
              </div>
              <div style={{ fontSize: 13, color: '#3A3A3C', marginTop: 2 }}><strong>Subject:</strong> {subject}</div>
            </div>

            <div style={{ padding: '28px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>{gym?.name}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', marginBottom: 8 }}>{subject}</div>
              <div style={{ fontSize: 14, color: '#8E8E93', marginBottom: 20 }}>Hey [Member Name],</div>
              <div style={{ background: '#F2F2F7', borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <p style={{ fontSize: 14, color: '#1C1C1E', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message}</p>
              </div>
              <div style={{ fontSize: 12, color: '#AEAEB2' }}>— The {gym?.name} team</div>
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
              <button onClick={() => setPreview(false)} style={{
                flex: 1, padding: 14, borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)',
                background: '#F2F2F7', color: '#1C1C1E', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Edit</button>
              <button onClick={handleSend} disabled={sending} style={{
                flex: 2, padding: 14, borderRadius: 14, border: 'none',
                background: '#007AFF', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{sending ? 'Sending...' : 'Send Now'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}