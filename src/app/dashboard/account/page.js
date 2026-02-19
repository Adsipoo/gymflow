'use client'
import { useState, useEffect } from 'react'
import { useUser } from '../layout'
import { useRouter } from 'next/navigation'

function Toast({ message, type, onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? '#34C759' : '#FF3B30',
      color: '#FFFFFF', padding: '14px 24px', borderRadius: 14,
      fontSize: 14, fontWeight: 600, zIndex: 9999,
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span>{type === 'success' ? '✅' : '❌'}</span>
      <span>{message}</span>
      <button onClick={onClose} style={{
        background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF',
        borderRadius: 8, padding: '2px 8px', marginLeft: 8,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>✕</button>
    </div>
  )
}

function StatusBadge({ status }) {
  const colors = { trialing: '#FF9500', active: '#34C759', cancelled: '#FF3B30', past_due: '#FF3B30' }
  const labels = { trialing: 'Free Trial', active: 'Active', cancelled: 'Cancelled', past_due: 'Payment Failed' }
  const color = colors[status] || '#8E8E93'
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '14', padding: '3px 8px', borderRadius: 6 }}>
      {labels[status] || status}
    </span>
  )
}

const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
const accent = '#007AFF'

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export default function AccountPage() {
  const { profile, supabase } = useUser()
  const router = useRouter()
  const [memberships, setMemberships] = useState([])
  const [tiersMap, setTiersMap] = useState({}) // gymId -> tiers[]
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(null) // membership object
  const [toast, setToast] = useState(null)

  const isOwner = profile?.role === 'owner'

  useEffect(() => {
    if (profile) load()
  }, [profile])

  const load = async () => {
    if (!isOwner) {
      // Fetch all memberships with gym + tier info
      const { data: membershipData } = await supabase
        .from('gym_memberships')
        .select('*, gyms(*), membership_tiers(*)')
        .eq('member_id', profile.id)
        .order('created_at', { ascending: false })

      const ms = membershipData || []
      setMemberships(ms)

      // For each gym, fetch all available tiers
      const gymIds = [...new Set(ms.map(m => m.gym_id))]
      if (gymIds.length > 0) {
        const { data: tiersData } = await supabase
          .from('membership_tiers')
          .select('*')
          .in('gym_id', gymIds)
          .eq('is_active', true)

        const map = {}
        for (const t of tiersData || []) {
          if (!map[t.gym_id]) map[t.gym_id] = []
          map[t.gym_id].push(t)
        }
        setTiersMap(map)
      }
    }

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*, gyms(name)')
      .eq('member_id', profile.id)
      .order('created_at', { ascending: false })
    setPayments(paymentsData || [])

    setLoading(false)
  }

  const handleChangePlan = async (membership, newTierId) => {
    setActionLoading(newTierId)
    try {
      const res = await fetch('/api/stripe/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, gymId: membership.gym_id, newTierId })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setToast({ message: 'Plan updated successfully!', type: 'success' })
      await load()
    } catch {
      setToast({ message: 'Could not change plan. Please try again.', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    if (!cancelConfirm) return
    setActionLoading('cancel')
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, gymId: cancelConfirm.gym_id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setToast({ message: 'Subscription cancelled. You keep access until the end of your billing period.', type: 'success' })
      setCancelConfirm(null)
      await load()
    } catch {
      setToast({ message: 'Could not cancel. Please try again.', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?'

  if (loading) return <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8E8E93', fontFamily: font }}>Loading...</div>

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto', fontFamily: font }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Cancel confirmation modal */}
      {cancelConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 400, width: '100%' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Cancel subscription?</h3>
            <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>
              You'll keep access to <strong>{cancelConfirm.gyms?.name}</strong> until <strong>{formatDate(cancelConfirm.current_period_end)}</strong>. After that your membership will end.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setCancelConfirm(null)} style={{
                flex: 1, padding: 14, borderRadius: 12,
                border: '1.5px solid #e5e7eb', background: 'white',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font
              }}>Keep membership</button>
              <button onClick={handleCancel} disabled={actionLoading === 'cancel'} style={{
                flex: 1, padding: 14, borderRadius: 12,
                border: 'none', background: '#FF3B30', color: 'white',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font
              }}>{actionLoading === 'cancel' ? 'Cancelling...' : 'Yes, cancel'}</button>
            </div>
          </div>
        </div>
      )}

      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 24px' }}>Account</h1>

      {/* Profile card */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, background: accent + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#636366',
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{profile?.full_name}</div>
            <div style={{ fontSize: 14, color: '#8E8E93' }}>{profile?.email}</div>
            <div style={{ marginTop: 6 }}>
              {isOwner
                ? <span style={{ fontSize: 11, fontWeight: 600, color: accent, background: accent + '14', padding: '3px 8px', borderRadius: 6 }}>Owner</span>
                : <span style={{ fontSize: 11, fontWeight: 600, color: '#34C759', background: '#34C75914', padding: '3px 8px', borderRadius: 6 }}>{memberships.length} venue{memberships.length !== 1 ? 's' : ''}</span>
              }
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Member since', profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString() : '—'],
            ['Classes attended', String(profile?.classes_attended || 0)],
            ['Phone', profile?.phone || 'Not set'],
            ['Email', profile?.email || '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12 }}>
              <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{label}</div>
              <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Memberships — members only */}
      {!isOwner && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: 0 }}>My Venues</h2>
            <button onClick={() => router.push('/dashboard/venues')} style={{
              background: accent, color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: 10, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: font,
            }}>+ Add Venue</button>
          </div>

          {memberships.length === 0 && (
            <div style={{
              background: '#FFFFFF', borderRadius: 16, padding: 32,
              border: '1px solid rgba(0,0,0,0.06)', marginBottom: 12, textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏋️</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E', marginBottom: 8 }}>No active memberships</div>
              <div style={{ fontSize: 14, color: '#8E8E93', marginBottom: 16 }}>Join a venue to get started</div>
              <button onClick={() => router.push('/dashboard/venues')} style={{
                padding: '12px 24px', background: accent, color: 'white',
                border: 'none', borderRadius: 12, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', fontFamily: font
              }}>Browse Venues</button>
            </div>
          )}

          {memberships.map(ms => {
            const tier = ms.membership_tiers
            const gym = ms.gyms
            const otherTiers = (tiersMap[ms.gym_id] || []).filter(t => t.id !== ms.tier_id)
            const isActive = ms.status === 'trialing' || ms.status === 'active'

            return (
              <div key={ms.id} style={{
                background: '#FFFFFF', borderRadius: 16, padding: 20,
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
              }}>
                {/* Gym header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {gym?.logo_url && (
                      <img src={gym.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                    )}
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{gym?.name}</div>
                      <div style={{ fontSize: 12, color: '#8E8E93' }}>{gym?.category}</div>
                    </div>
                  </div>
                  <StatusBadge status={ms.status} />
                </div>

                {/* Plan info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{tier?.name}</div>
                    {tier?.description && <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>{tier.description}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E' }}>${(tier?.price_cents / 100).toFixed(0)}</div>
                    <div style={{ fontSize: 11, color: '#8E8E93' }}>/month</div>
                  </div>
                </div>

                {/* Status info */}
                {ms.status === 'trialing' && ms.trial_ends_at && (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#c2410c' }}>🎉 Free trial ends {formatDate(ms.trial_ends_at)}</div>
                    <div style={{ fontSize: 12, color: '#9a3412', marginTop: 2 }}>Card charged ${(tier?.price_cents / 100).toFixed(0)} after trial</div>
                  </div>
                )}
                {ms.status === 'active' && ms.current_period_end && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>✅ Next billing: {formatDate(ms.current_period_end)}</div>
                  </div>
                )}
                {ms.status === 'cancelled' && (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#be123c' }}>❌ Cancelled — access until {formatDate(ms.current_period_end)}</div>
                  </div>
                )}
                {ms.status === 'past_due' && (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#be123c' }}>⚠️ Payment failed — please update your payment method</div>
                  </div>
                )}

                {/* Change plan */}
                {otherTiers.length > 0 && isActive && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 }}>Switch Plan</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {otherTiers.map(t => (
                        <div key={t.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: '#F2F2F7', borderRadius: 10, padding: '10px 14px',
                        }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1E' }}>
                            {t.name} — ${(t.price_cents / 100).toFixed(0)}/mo
                          </div>
                          <button onClick={() => handleChangePlan(ms, t.id)} disabled={actionLoading === t.id} style={{
                            background: accent + '10', border: 'none', color: accent,
                            padding: '6px 14px', borderRadius: 8, fontSize: 12,
                            fontWeight: 600, cursor: 'pointer', fontFamily: font,
                          }}>
                            {actionLoading === t.id ? '...' : t.price_cents > tier?.price_cents ? 'Upgrade' : 'Downgrade'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancel */}
                {isActive && (
                  <button onClick={() => setCancelConfirm(ms)} style={{
                    background: 'none', border: '1.5px solid #e5e7eb', color: '#6b7280',
                    padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: font,
                  }}>Cancel subscription</button>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <>
          <h3 style={{ color: '#1C1C1E', fontSize: 17, fontWeight: 600, margin: '28px 0 12px' }}>Payment History</h3>
          {payments.map(p => (
            <div key={p.id} style={{
              background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 14, padding: 18, marginBottom: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600 }}>{p.gyms?.name || 'Membership'}</div>
                <div style={{ color: '#8E8E93', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#1C1C1E', fontWeight: 700 }}>${(p.amount / 100).toFixed(2)}</div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: p.status === 'succeeded' ? '#34C759' : '#FF9500',
                  background: (p.status === 'succeeded' ? '#34C759' : '#FF9500') + '14',
                  padding: '3px 8px', borderRadius: 6,
                }}>{p.status}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}