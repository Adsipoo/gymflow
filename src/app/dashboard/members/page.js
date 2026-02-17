'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../layout'

const TIERS = ['basic', 'premium', 'allAccess']
const STATUSES = ['pending', 'active', 'suspended']
const tierColors = { basic: '#34C759', premium: '#007AFF', allAccess: '#5856D6' }
const statusColors = { pending: '#FF9500', active: '#34C759', suspended: '#FF3B30' }
const tierLabels = { basic: 'Basic', premium: 'Premium', allAccess: 'All-Access' }

function Bdg({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '14', padding: '3px 8px', borderRadius: 6 }}>{text}</span>
}

function initials(n) {
  if (!n) return '?'
  const p = n.split(' ')
  return p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)
}

const inputStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
  color: '#1C1C1E', fontSize: 14, outline: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
  boxSizing: 'border-box',
}

export default function AdminMembersPage() {
  const { supabase } = useUser()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [modal, setModal] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('joined_at', { ascending: false })
      setMembers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleUpdate = async (id, field, value) => {
    await supabase.from('profiles').update({ [field]: value }).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
    if (modal?.id === id) setModal(prev => ({ ...prev, [field]: value }))
  }

  const filtered = members.filter(m => {
    const matchSearch = !search || 
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
    const matchTier = filterTier === 'all' || m.tier === filterTier
    const matchStatus = filterStatus === 'all' || m.status === filterStatus
    return matchSearch && matchTier && matchStatus
  })

  const counts = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    pending: members.filter(m => m.status === 'pending').length,
    allAccess: members.filter(m => m.tier === 'allAccess').length,
  }

  if (loading) {
    return <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>
        Members
      </h1>
      <p style={{ color: '#8E8E93', fontSize: 14, margin: '0 0 24px' }}>
        {counts.total} total · {counts.active} active · {counts.pending} pending
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          ['Total', counts.total, '#007AFF'],
          ['Active', counts.active, '#34C759'],
          ['Pending', counts.pending, '#FF9500'],
          ['All-Access', counts.allAccess, '#5856D6'],
        ].map(([label, val, color]) => (
          <div key={label} style={{
            background: '#FFFFFF', borderRadius: 12, padding: '14px 10px', textAlign: 'center',
            border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ color, fontSize: 22, fontWeight: 700 }}>{val}</div>
            <div style={{ color: '#8E8E93', fontSize: 10, fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', ...TIERS].map(t => (
          <button key={t} onClick={() => setFilterTier(t)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: '1px solid ' + (filterTier === t ? (tierColors[t] || '#007AFF') + '30' : 'rgba(0,0,0,0.06)'),
            background: filterTier === t ? (tierColors[t] || '#007AFF') + '0A' : 'transparent',
            color: filterTier === t ? (tierColors[t] || '#007AFF') : '#8E8E93',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
          }}>
            {t === 'all' ? 'All Tiers' : tierLabels[t]}
          </button>
        ))}
        <div style={{ width: 1, background: 'rgba(0,0,0,0.08)', margin: '0 4px' }} />
        {['all', ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: '1px solid ' + (filterStatus === s ? (statusColors[s] || '#007AFF') + '30' : 'rgba(0,0,0,0.06)'),
            background: filterStatus === s ? (statusColors[s] || '#007AFF') + '0A' : 'transparent',
            color: filterStatus === s ? (statusColors[s] || '#007AFF') : '#8E8E93',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            textTransform: 'capitalize',
          }}>
            {s === 'all' ? 'All Status' : s}
          </button>
        ))}
      </div>

      {/* Member List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#8E8E93' }}>
          No members found
        </div>
      ) : filtered.map(m => (
        <div
          key={m.id}
          onClick={() => setModal(m)}
          style={{
            background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 14, padding: 16, marginBottom: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 13,
            background: (tierColors[m.tier] || '#007AFF') + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#636366', flexShrink: 0,
          }}>
            {initials(m.full_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>
              {m.full_name || 'Unnamed'}
            </div>
            <div style={{ fontSize: 12, color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.email}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <Bdg text={tierLabels[m.tier] || m.tier || 'Basic'} color={tierColors[m.tier] || '#34C759'} />
            <Bdg text={m.status || 'pending'} color={statusColors[m.status] || '#FF9500'} />
          </div>
        </div>
      ))}

      {/* Member Detail Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: 20, padding: 28,
            maxWidth: 460, width: '100%', border: '1px solid rgba(0,0,0,0.06)',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: (tierColors[modal.tier] || '#007AFF') + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#636366',
                }}>
                  {initials(modal.full_name)}
                </div>
                <div>
                  <h2 style={{ color: '#1C1C1E', margin: '0 0 2px', fontSize: 18, fontWeight: 700 }}>
                    {modal.full_name || 'Unnamed'}
                  </h2>
                  <div style={{ color: '#8E8E93', fontSize: 13 }}>{modal.email}</div>
                </div>
              </div>
              <button onClick={() => setModal(null)} style={{
                background: '#F2F2F7', border: 'none', color: '#8E8E93',
                width: 32, height: 32, borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
                ✕
              </button>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
              {[
                ['Role', modal.role || 'member'],
                ['Phone', modal.phone || 'Not set'],
                ['Classes', String(modal.classes_attended || 0)],
                ['Joined', modal.joined_at ? new Date(modal.joined_at).toLocaleDateString() : '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12 }}>
                  <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>
                    {l}
                  </div>
                  <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Tier Control */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Membership Tier
              </label>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {TIERS.map(t => (
                  <button
                    key={t}
                    onClick={() => handleUpdate(modal.id, 'tier', t)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 10,
                      border: '1px solid ' + (modal.tier === t ? tierColors[t] + '40' : 'rgba(0,0,0,0.06)'),
                      background: modal.tier === t ? tierColors[t] + '10' : '#F2F2F7',
                      color: modal.tier === t ? tierColors[t] : '#8E8E93',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {tierLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Control */}
            <div>
              <label style={{ color: '#8E8E93', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Status
              </label>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleUpdate(modal.id, 'status', s)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 10,
                      border: '1px solid ' + (modal.status === s ? statusColors[s] + '40' : 'rgba(0,0,0,0.06)'),
                      background: modal.status === s ? statusColors[s] + '10' : '#F2F2F7',
                      color: modal.status === s ? statusColors[s] : '#8E8E93',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      textTransform: 'capitalize',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
