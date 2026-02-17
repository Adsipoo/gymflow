'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../layout'
import { useSearchParams } from 'next/navigation'

const TIERS = {
  basic: {
    name: 'Basic', price: 29, desc: 'Start your wellness journey',
    classes: ['Yoga', 'Stretching', 'Meditation'], color: '#34C759'
  },
  premium: {
    name: 'Premium', price: 59, desc: 'Unlock high-intensity training',
    classes: ['Yoga', 'Stretching', 'Meditation', 'HIIT', 'Spin', 'Boxing'], color: '#007AFF'
  },
  allAccess: {
    name: 'All-Access', price: 99, desc: 'Every class. No limits.',
    classes: ['Yoga', 'Stretching', 'Meditation', 'HIIT', 'Spin', 'Boxing', 'CrossFit', 'PT Session', 'Pilates'],
    color: '#5856D6'
  },
}

function Bdg({ text, color }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color,
      background: color + '14', padding: '3px 8px', borderRadius: 6,
    }}>{text}</span>
  )
}

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
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFF',
          borderRadius: 8, padding: '2px 8px', marginLeft: 8,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >✕</button>
    </div>
  )
}

export default function AccountPage() {
  const { profile, supabase, setProfile } = useUser()
  const searchParams = useSearchParams()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const paymentStatus = searchParams.get('payment')
    const newTier = searchParams.get('tier')

    if (paymentStatus === 'success' && newTier) {
      async function refreshProfile() {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profile.id)
          .single()
        if (data) setProfile(data)
      }
      refreshProfile()
      setToast({ message: `Plan changed to ${TIERS[newTier]?.name || newTier}!`, type: 'success' })
      window.history.replaceState({}, '', '/dashboard/account')
    } else if (paymentStatus === 'cancelled') {
      setToast({ message: 'Payment cancelled', type: 'error' })
      window.history.replaceState({}, '', '/dashboard/account')
    }
  }, [searchParams])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('member_id', profile.id)
        .order('created_at', { ascending: false })
      setPayments(data || [])
      setLoading(false)
    }
    if (profile) load()
  }, [profile])

  const currentTier = TIERS[profile?.tier] || TIERS.basic
  const otherTiers = Object.entries(TIERS).filter(([k]) => k !== profile?.tier)
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?'

  async function handleCheckout(tierKey) {
    setCheckoutLoading(tierKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierKey,
          userId: profile.id,
          userEmail: profile.email,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setToast({ message: data.error || 'Checkout failed', type: 'error' })
      }
    } catch (err) {
      setToast({ message: 'Something went wrong', type: 'error' })
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <h1 style={{
        fontSize: 28, fontWeight: 700, color: '#1C1C1E',
        letterSpacing: -0.5, margin: '0 0 24px',
      }}>Account</h1>

      {/* Profile Card */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: currentTier.color + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#636366',
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>
              {profile?.full_name}
            </div>
            <div style={{ fontSize: 14, color: '#8E8E93' }}>{profile?.email}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Bdg text={profile?.status || 'pending'} color={profile?.status === 'active' ? '#34C759' : '#FF9500'} />
              <Bdg text={currentTier.name} color={currentTier.color} />
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Member since', profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString() : '—'],
            ['Classes attended', String(profile?.classes_attended || 0)],
            ['Phone', profile?.phone || 'Not set'],
            ['Monthly rate', '$' + currentTier.price],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12 }}>
              <div style={{
                color: '#8E8E93', fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3,
              }}>{label}</div>
              <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Plan */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 20,
        border: '1px solid ' + currentTier.color + '20',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#8E8E93',
              textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4,
            }}>Current Plan</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{currentTier.name}</div>
            <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{currentTier.desc}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E' }}>${currentTier.price}</div>
            <div style={{ fontSize: 12, color: '#8E8E93' }}>/month</div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {currentTier.classes.map(c => (
            <span key={c} style={{
              fontSize: 11, fontWeight: 600, color: '#3A3A3C',
              background: '#F2F2F7', padding: '4px 10px', borderRadius: 6,
            }}>{c}</span>
          ))}
        </div>
      </div>

      {/* Change Plan */}
      <h3 style={{ color: '#1C1C1E', fontSize: 17, fontWeight: 600, margin: '24px 0 12px' }}>
        Change Plan
      </h3>
      {otherTiers.map(([key, tier]) => (
        <div key={key} style={{
          background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 14, padding: 18, marginBottom: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
              {tier.name} — ${tier.price}/mo
            </div>
            <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
              {tier.classes.length} class types
            </div>
          </div>
          <button
            onClick={() => handleCheckout(key)}
            disabled={checkoutLoading === key}
            style={{
              background: checkoutLoading === key ? '#E5E5EA' : tier.color + '10',
              border: 'none',
              color: checkoutLoading === key ? '#8E8E93' : tier.color,
              padding: '8px 18px', borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: checkoutLoading === key ? 0.7 : 1,
            }}
          >
            {checkoutLoading === key
              ? 'Redirecting...'
              : tier.price > currentTier.price ? 'Upgrade' : 'Downgrade'}
          </button>
        </div>
      ))}

      {/* Payment History */}
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
                  {TIERS[p.tier]?.name || p.tier}
                </div>
                <div style={{ color: '#8E8E93', fontSize: 12 }}>
                  {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#1C1C1E', fontWeight: 700 }}>${(p.amount / 100).toFixed(2)}</div>
                <Bdg text={p.status} color={p.status === 'succeeded' ? '#34C759' : '#FF9500'} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
