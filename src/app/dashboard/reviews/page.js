'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '../layout'

const tc = { Yoga: '#34C759', HIIT: '#FF3B30', Spin: '#007AFF', Boxing: '#FF9500', CrossFit: '#5856D6', Meditation: '#5AC8FA', Stretching: '#30D158', 'PT Session': '#FF9500', Pilates: '#AF52DE' }

function Bdg({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '14', padding: '3px 8px', borderRadius: 6 }}>{text}</span>
}

function Stars({ rating, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= rating ? '#FF9500' : '#D1D1D6'}>
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  )
}

function initials(n) {
  if (!n) return '?'
  const p = n.split(' ')
  return p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)
}

export default function AdminReviewsPage() {
  const { supabase } = useUser()
  const [reviews, setReviews] = useState([])
  const [members, setMembers] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRating, setFilterRating] = useState('all')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    async function load() {
      const [rvRes, mbRes, trRes] = await Promise.all([
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('trainers').select('id, name'),
      ])
      setReviews(rvRes.data || [])
      setMembers(mbRes.data || [])
      setTrainers(trRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const getMember = (id) => members.find(m => m.id === id) || { full_name: 'Unknown', email: '' }
  const getTrainer = (id) => trainers.find(t => t.id === id) || { name: 'TBA' }

  const filtered = reviews.filter(r => {
    const matchRating = filterRating === 'all' || r.rating === parseInt(filterRating)
    const matchType = filterType === 'all' || r.class_type === filterType
    return matchRating && matchType
  })

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—'

  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++ })
    return dist
  }, [reviews])

  const maxDist = Math.max(...ratingDist, 1)

  // Top rated trainers
  const trainerStats = useMemo(() => {
    const stats = {}
    reviews.forEach(r => {
      if (!r.trainer_id) return
      if (!stats[r.trainer_id]) stats[r.trainer_id] = { total: 0, count: 0 }
      stats[r.trainer_id].total += r.rating
      stats[r.trainer_id].count++
    })
    return Object.entries(stats)
      .map(([id, s]) => ({ id, avg: s.total / s.count, count: s.count, name: getTrainer(id).name }))
      .sort((a, b) => b.avg - a.avg)
  }, [reviews, trainers])

  const classTypes = useMemo(() => {
    const types = new Set()
    reviews.forEach(r => { if (r.class_type) types.add(r.class_type) })
    return ['all', ...Array.from(types).sort()]
  }, [reviews])

  const handleDelete = async (id) => {
    await supabase.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  if (loading) {
    return <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>
        Reviews
      </h1>
      <p style={{ color: '#8E8E93', fontSize: 14, margin: '0 0 24px' }}>
        {reviews.length} review{reviews.length !== 1 ? 's' : ''} · {avgRating} avg rating
      </p>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {/* Average Rating */}
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: 20, textAlign: 'center',
          border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ color: '#FF9500', fontSize: 36, fontWeight: 700 }}>{avgRating}</div>
          <Stars rating={Math.round(parseFloat(avgRating) || 0)} size={16} />
          <div style={{ color: '#8E8E93', fontSize: 11, marginTop: 4 }}>{reviews.length} reviews</div>
        </div>

        {/* Rating Distribution */}
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: 16,
          border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          {[5, 4, 3, 2, 1].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#8E8E93', width: 12, textAlign: 'right' }}>{n}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#FF9500">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <div style={{ flex: 1, height: 6, background: '#F2F2F7', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: (ratingDist[n - 1] / maxDist) * 100 + '%',
                  background: '#FF9500', borderRadius: 3,
                }} />
              </div>
              <span style={{ fontSize: 11, color: '#8E8E93', width: 16, textAlign: 'right' }}>{ratingDist[n - 1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Trainers */}
      {trainerStats.length > 0 && (
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: 18, marginBottom: 24,
          border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 12 }}>
            Trainer Ratings
          </div>
          {trainerStats.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: '#007AFF15', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#636366',
                }}>
                  {initials(t.name)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>{t.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Stars rating={Math.round(t.avg)} size={12} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FF9500' }}>{t.avg.toFixed(1)}</span>
                <span style={{ fontSize: 11, color: '#8E8E93' }}>({t.count})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', '5', '4', '3', '2', '1'].map(r => (
          <button key={r} onClick={() => setFilterRating(r)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: '1px solid ' + (filterRating === r ? '#FF9500' + '30' : 'rgba(0,0,0,0.06)'),
            background: filterRating === r ? '#FF9500' + '0A' : 'transparent',
            color: filterRating === r ? '#FF9500' : '#8E8E93',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
          }}>
            {r === 'all' ? 'All' : r + '★'}
          </button>
        ))}
        <div style={{ width: 1, background: 'rgba(0,0,0,0.08)', margin: '0 4px' }} />
        {classTypes.map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: '1px solid ' + (filterType === t ? (tc[t] || '#007AFF') + '30' : 'rgba(0,0,0,0.06)'),
            background: filterType === t ? (tc[t] || '#007AFF') + '0A' : 'transparent',
            color: filterType === t ? (tc[t] || '#007AFF') : '#8E8E93',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
          }}>
            {t === 'all' ? 'All Types' : t}
          </button>
        ))}
      </div>

      {/* Review List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#8E8E93' }}>
          {reviews.length === 0 ? 'No reviews yet' : 'No reviews match filters'}
        </div>
      ) : filtered.map(r => {
        const member = getMember(r.member_id)
        const trainer = getTrainer(r.trainer_id)
        return (
          <div key={r.id} style={{
            background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 14, padding: 16, marginBottom: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11,
                  background: '#007AFF15', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#636366',
                }}>
                  {initials(member.full_name)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>
                    {member.full_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stars rating={r.rating} size={12} />
                    <span style={{ fontSize: 11, color: '#8E8E93' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(r.id)} style={{
                background: '#FF3B3010', border: 'none', color: '#FF3B30',
                padding: '4px 10px', borderRadius: 8, fontSize: 11,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Delete
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {r.class_type && <Bdg text={r.class_type} color={tc[r.class_type] || '#007AFF'} />}
              <Bdg text={trainer.name} color="#8E8E93" />
            </div>

            {r.comment && (
              <p style={{ color: '#3A3A3C', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                {r.comment}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
