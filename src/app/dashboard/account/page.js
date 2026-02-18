'use client'
import { useState, useEffect } from 'react'
import { useUser } from '../layout'

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
  const colors = {
    trialing: '#FF9500',
    active: '#34C759',
    cancelled: '#FF3B30',
    past_due: '#FF3B30',
  }
  const labels = {
    trialing: 'Free Trial',
    active: 'Active',
    cancelled: 'Cancelled',
    past_due: 'Payment Failed',
  }
  const color = colors[status] || '#8E8E93'
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color,
      background: color + '14', padding: '3px 8px', borderRadius: 6,
    }}>
      {labels[status] || status}
    </span>
  )
}

export default function AccountPage() {
  const { profile, supabase, gym } = useUser()
  const [membership, setMembership] = useState(null)
  const [allTiers, setAllTiers] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [toast, setToast] = useState(null)

  const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
  const accent = '#007AFF'

  const isOwner = profile?.role === 'owner'
console.log('Render — profile:', profile?.id, 'gym:', gym?.id, 'isOwner:', isOwner)

  useEffect(() => {
  if (profile && gym) load()
}, [profile, gym])

  const load = async () => {
    console.log('Loading account, gym:', gym?.id, 'profile:', profile?.id, 'isOwner:', isOwner)
    // Load membership
    if (!isOwner && gym) {
      const { data: membershipData, error: membershipError } = await supabase
        .from('gym_memberships')
        .select('*, membership_tiers(*)')
        .eq('member_id', profile.id)
        .eq('gym_id', gym.id)
        .single()
      console.log('Membership data:', membershipData, 'Error:', membershipError)
      setMembership(membershipData)

      // Load all tiers for this gym
      const { data: tiersData } = await supabase
        .from('membership_tiers')
        .select('*')
        .eq('gym_id', gym.id)
        .eq('is_active', true)
      setAllTiers(tiersData || [])
    }

    // Load payment history
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .eq('member_id', profile.id)
      .order('created_at', { ascending: false })
    setPayments(paymentsData || [])

    setLoading(false)
  }

  const handleChangePlan = async (newTierId) => {
    setActionLoading(newTierId)
    try {
      const res = await fetch('/api/stripe/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          gymId: gym.id,
          newTierId
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setToast({ message: 'Plan updated successfully!', type: 'success' })
      await load()
    } catch (err) {
      setToast({ message: 'Could not change plan. Please try again.', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async () => {
    setActionLoading('cancel')
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          gymId: gym.id
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setToast({ message: 'Subscription cancelled. You keep access until the end of your billing period.', type: 'success' })
      setShowCancelConfirm(false)
      await load()
    } catch (err) {
      setToast({ message: 'Could not cancel. Please try again.', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?'

  const currentTier = membership?.membership_tiers
  const otherTiers = allTiers.filter(t => t.id !== currentTier?.id)

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) return (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8E8E93', fontFamily: font }}>
      Loading...
    </div>
  )

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto', fontFamily: font }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Cancel confirmation modal */}
      {showCancelConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '12px' }}>
              Cancel subscription?
            </h3>
            <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px', lineHeight: '1.5' }}>
              You'll keep access to {gym?.name} until <strong>{formatDate(membership?.current_period_end)}</strong>. After that your membership will end.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  border: '1.5px solid #e5e7eb', background: 'white',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: font
                }}>
                Keep membership
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading === 'cancel'}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  border: 'none', background: '#FF3B30', color: 'white',
                  fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: font
                }}>
                {actionLoading === 'cancel' ? 'Cancelling...' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 24px' }}>
        Account
      </h1>

      {/* Profile card */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: accent + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#636366',
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{profile?.full_name}</div>
            <div style={{ fontSize: 14, color: '#8E8E93' }}>{profile?.email}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {isOwner
                ? <span style={{ fontSize: 11, fontWeight: 600, color: accent, background: accent + '14', padding: '3px 8px', borderRadius: 6 }}>Owner</span>
                : membership && <StatusBadge status={membership.status} />
              }
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Member since', profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString() : '—'],
            ['Classes attended', String(profile?.classes_attended || 0)],
            ['Phone', profile?.phone || 'Not set'],
            ['Venue', gym?.name || '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12 }}>
              <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{label}</div>
              <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Membership section — members only */}
      {!isOwner && membership && (
        <>
          {/* Current plan */}
          <div style={{
            background: '#FFFFFF', borderRadius: 16, padding: 20,
            border: `1px solid ${accent}20`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 12 }}>
              Current Plan
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E' }}>{currentTier?.name}</div>
                {currentTier?.description && <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{currentTier.description}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E' }}>
                  ${(currentTier?.price_cents / 100).toFixed(0)}
                </div>
                <div style={{ fontSize: 12, color: '#8E8E93' }}>/month</div>
              </div>
            </div>

            {/* Trial or billing info */}
            {membership.status === 'trialing' && membership.trial_ends_at && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c2410c' }}>
                  🎉 Free trial ends {formatDate(membership.trial_ends_at)}
                </div>
                <div style={{ fontSize: 12, color: '#9a3412', marginTop: 2 }}>
                  Your card will be charged ${(currentTier?.price_cents / 100).toFixed(0)} after your trial ends
                </div>
              </div>
            )}
            {membership.status === 'active' && membership.current_period_end && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                  ✅ Next billing date: {formatDate(membership.current_period_end)}
                </div>
              </div>
            )}
            {membership.status === 'cancelled' && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#be123c' }}>
                  ❌ Cancelled — access until {formatDate(membership.current_period_end)}
                </div>
              </div>
            )}
            {membership.status === 'past_due' && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#be123c' }}>
                  ⚠️ Payment failed — please update your payment method
                </div>
              </div>
            )}

            {/* Cancel button */}
            {(membership.status === 'trialing' || membership.status === 'active') && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                style={{
                  background: 'none', border: '1.5px solid #e5e7eb', color: '#6b7280',
                  padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: font
                }}>
                Cancel subscription
              </button>
            )}
          </div>

          {/* Change plan */}
          {otherTiers.length > 0 && membership.status !== 'cancelled' && (
            <>
              <h3 style={{ color: '#1C1C1E', fontSize: 17, fontWeight: 600, margin: '24px 0 12px' }}>
                Change Plan
              </h3>
              {otherTiers.map(tier => (
                <div key={tier.id} style={{
                  background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 14, padding: 18, marginBottom: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
                      {tier.name} — ${(tier.price_cents / 100).toFixed(0)}/mo
                    </div>
                    {tier.description && (
                      <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>{tier.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleChangePlan(tier.id)}
                    disabled={actionLoading === tier.id}
                    style={{
                      background: actionLoading === tier.id ? '#E5E5EA' : accent + '10',
                      border: 'none', color: actionLoading === tier.id ? '#8E8E93' : accent,
                      padding: '8px 18px', borderRadius: 10,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    {actionLoading === tier.id ? 'Updating...'
                      : tier.price_cents > currentTier?.price_cents ? 'Upgrade' : 'Downgrade'}
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* No membership yet */}
      {!isOwner && !membership && (
        <div style={{
          background: '#FFFFFF', borderRadius: 16, padding: 24,
          border: '1px solid rgba(0,0,0,0.06)', marginBottom: 12, textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏋️</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1C1C1E', marginBottom: '8px' }}>No active membership</div>
          <div style={{ fontSize: '14px', color: '#8E8E93', marginBottom: '16px' }}>Join a venue to get started</div>
          <button
            onClick={() => window.location.href = '/venues'}
            style={{
              padding: '12px 24px', background: accent, color: 'white',
              border: 'none', borderRadius: '12px', fontSize: '14px',
              fontWeight: '600', cursor: 'pointer', fontFamily: font
            }}>
            Browse venues
          </button>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <>
          <h3 style={{ color: '#1C1C1E', fontSize: 17, fontWeight: 600, margin: '28px 0 12px' }}>
            Payment History
          </h3>
          {payments.map(p => (
            <div key={p.id} style={{
              background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 14, padding: 18, marginBottom: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600 }}>
                  {gym?.name || 'Membership'}
                </div>
                <div style={{ color: '#8E8E93', fontSize: 12 }}>
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#1C1C1E', fontWeight: 700 }}>${(p.amount / 100).toFixed(2)}</div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: p.status === 'succeeded' ? '#34C759' : '#FF9500',
                  background: (p.status === 'succeeded' ? '#34C759' : '#FF9500') + '14',
                  padding: '3px 8px', borderRadius: 6
                }}>{p.status}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}