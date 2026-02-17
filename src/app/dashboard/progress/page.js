'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '../layout'

const tc = { Yoga: '#34C759', HIIT: '#FF3B30', Spin: '#007AFF', Boxing: '#FF9500', CrossFit: '#5856D6', Meditation: '#5AC8FA', Stretching: '#30D158', 'PT Session': '#FF9500', Pilates: '#AF52DE' }

function Bdg({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '14', padding: '3px 8px', borderRadius: 6 }}>{text}</span>
}

export default function ProgressPage() {
  const { profile, supabase } = useUser()
  const [bookings, setBookings] = useState([])
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [bkRes, clsRes, trRes] = await Promise.all([
        supabase.from('bookings').select('*').eq('member_id', profile.id).order('booked_at', { ascending: false }),
        supabase.from('classes').select('*'),
        supabase.from('trainers').select('*'),
      ])
      setBookings(bkRes.data || [])
      setClasses(clsRes.data || [])
      setTrainers(trRes.data || [])
      setLoading(false)
    }
    if (profile) load()
  }, [profile])

  const getClass = (id) => classes.find(c => c.id === id)
  const getTrainer = (id) => trainers.find(t => t.id === id) || { name: 'TBA' }

  const completed = bookings.filter(b => b.status === 'completed')
  const allActive = bookings.filter(b => b.status === 'booked' || b.status === 'checked_in' || b.status === 'completed')
  const totalClasses = allActive.length

  // Favourite class type
  const favType = useMemo(() => {
    if (!allActive.length) return null
    const counts = {}
    allActive.forEach(b => {
      const cls = getClass(b.class_id)
      if (cls) counts[cls.type] = (counts[cls.type] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted.length ? { type: sorted[0][0], count: sorted[0][1] } : null
  }, [allActive, classes])

  // Favourite trainer
  const favTrainer = useMemo(() => {
    if (!allActive.length) return null
    const counts = {}
    allActive.forEach(b => {
      const cls = getClass(b.class_id)
      if (cls) counts[cls.trainer_id] = (counts[cls.trainer_id] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (!sorted.length) return null
    const tr = getTrainer(sorted[0][0])
    return { name: tr.name, count: sorted[0][1] }
  }, [allActive, classes, trainers])

  // Weekly data (group by week)
  const weeklyData = useMemo(() => {
    const weeks = {}
    allActive.forEach(b => {
      const date = new Date(b.booked_at)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      weeks[key] = (weeks[key] || 0) + 1
    })
    return Object.entries(weeks).map(([week, count]) => ({ week, count })).slice(-8)
  }, [allActive])

  const maxBar = weeklyData.length ? Math.max(...weeklyData.map(w => w.count)) : 1

  // Class type breakdown
  const typeBreakdown = useMemo(() => {
    const counts = {}
    allActive.forEach(b => {
      const cls = getClass(b.class_id)
      if (cls) counts[cls.type] = (counts[cls.type] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [allActive, classes])

  if (loading) {
    return <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>
        Progress
      </h1>
      <p style={{ color: '#8E8E93', fontSize: 14, margin: '0 0 24px' }}>
        Your fitness journey
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: 18, textAlign: 'center',
          border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ color: '#007AFF', fontSize: 32, fontWeight: 700 }}>{totalClasses}</div>
          <div style={{ color: '#8E8E93', fontSize: 12, marginTop: 2 }}>Classes</div>
        </div>
        <div style={{
          background: '#FFFFFF', borderRadius: 14, padding: 18, textAlign: 'center',
          border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ color: '#5856D6', fontSize: 32, fontWeight: 700 }}>{completed.length}</div>
          <div style={{ color: '#8E8E93', fontSize: 12, marginTop: 2 }}>Completed</div>
        </div>
        {favType && (
          <div style={{
            background: '#FFFFFF', borderRadius: 14, padding: 18, textAlign: 'center',
            border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ color: tc[favType.type] || '#007AFF', fontSize: 17, fontWeight: 700 }}>{favType.type}</div>
            <div style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>{favType.count}× · Favourite</div>
          </div>
        )}
        {favTrainer && (
          <div style={{
            background: '#FFFFFF', borderRadius: 14, padding: 18, textAlign: 'center',
            border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 700 }}>{favTrainer.name}</div>
            <div style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>{favTrainer.count}× · Top Trainer</div>
          </div>
        )}
      </div>

      {/* Weekly Activity */}
      {weeklyData.length > 0 && (
        <>
          <h3 style={{ color: '#1C1C1E', fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
            Weekly Activity
          </h3>
          <div style={{
            background: '#FFFFFF', borderRadius: 14, padding: 20,
            border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: 28,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {weeklyData.map((w, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#3A3A3C', fontSize: 11, fontWeight: 600 }}>{w.count}</span>
                  <div style={{
                    width: '100%', background: '#007AFF',
                    borderRadius: 6, height: (w.count / maxBar) * 70 + 'px',
                    minHeight: 4, opacity: 0.5 + 0.5 * (w.count / maxBar),
                  }} />
                  <span style={{ color: '#8E8E93', fontSize: 10 }}>{w.week.split(' ')[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Class Breakdown */}
      {typeBreakdown.length > 0 && (
        <>
          <h3 style={{ color: '#1C1C1E', fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
            Class Breakdown
          </h3>
          <div style={{
            background: '#FFFFFF', borderRadius: 14, padding: 20,
            border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: 28,
          }}>
            {typeBreakdown.map(([type, count]) => {
              const pct = totalClasses > 0 ? (count / totalClasses) * 100 : 0
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{type}</span>
                    <span style={{ fontSize: 12, color: '#8E8E93' }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: '#F2F2F7', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: pct + '%',
                      background: tc[type] || '#007AFF', borderRadius: 3,
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Recent Activity */}
      <h3 style={{ color: '#1C1C1E', fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
        Recent Activity
      </h3>
      {allActive.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>
          <p>No activity yet. Book your first class to get started.</p>
          <a href="/dashboard/schedule" style={{
            display: 'inline-block', padding: '12px 24px', borderRadius: 12,
            background: '#007AFF', color: '#fff', fontSize: 14, fontWeight: 600,
            textDecoration: 'none', marginTop: 12,
          }}>
            Browse Classes
          </a>
        </div>
      ) : (
        allActive.slice(0, 10).map(bk => {
          const cls = getClass(bk.class_id)
          if (!cls) return null
          const tr = getTrainer(cls.trainer_id)
          return (
            <div key={bk.id} style={{
              background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 14, padding: 14, marginBottom: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bdg text={cls.type} color={tc[cls.type]} />
                <span style={{ color: '#1C1C1E', fontSize: 13, fontWeight: 600 }}>{tr.name}</span>
                {bk.status === 'completed' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#34C759">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </div>
              <span style={{ color: '#8E8E93', fontSize: 12 }}>
                {new Date(bk.booked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}