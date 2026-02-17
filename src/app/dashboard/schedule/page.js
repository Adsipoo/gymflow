'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '../layout'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CLS_TYPES = ['All', 'Yoga', 'HIIT', 'Spin', 'Boxing', 'CrossFit', 'Meditation', 'Stretching', 'PT Session', 'Pilates']
const tc = { Yoga: '#34C759', HIIT: '#FF3B30', Spin: '#007AFF', Boxing: '#FF9500', CrossFit: '#5856D6', Meditation: '#5AC8FA', Stretching: '#30D158', 'PT Session': '#FF9500', Pilates: '#AF52DE' }
const TIER_ACCESS = {
  basic: ['Yoga', 'Stretching', 'Meditation'],
  premium: ['Yoga', 'Stretching', 'Meditation', 'HIIT', 'Spin', 'Boxing'],
  allAccess: ['Yoga', 'Stretching', 'Meditation', 'HIIT', 'Spin', 'Boxing', 'CrossFit', 'PT Session', 'Pilates'],
}

const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })
const todayDay = DAYS.includes(today) ? today : 'Mon'

function Bdg({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '14', padding: '3px 8px', borderRadius: 6 }}>{text}</span>
}

function initials(n) {
  if (!n) return '?'
  const p = n.split(' ')
  return p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)
}

export default function SchedulePage() {
  const { profile, supabase } = useUser()
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [bookings, setBookings] = useState([])
  const [selDay, setSelDay] = useState(todayDay)
  const [selType, setSelType] = useState('All')
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [clsRes, trRes, bkRes] = await Promise.all([
        supabase.from('classes').select('*').order('time'),
        supabase.from('trainers').select('*'),
        supabase.from('bookings').select('*').eq('member_id', profile.id).in('status', ['booked', 'checked_in']),
      ])
      setClasses(clsRes.data || [])
      setTrainers(trRes.data || [])
      setBookings(bkRes.data || [])
      setLoading(false)
    }
    if (profile) load()
  }, [profile])

  const getTrainer = (id) => trainers.find(t => t.id === id) || { name: 'TBA', specialty: '' }
  const canAccess = (type) => TIER_ACCESS[profile?.tier]?.includes(type)
  const isBooked = (classId) => bookings.some(b => b.class_id === classId && b.status !== 'cancelled')
  const bookingCount = (classId) => bookings.filter(b => b.class_id === classId && b.status === 'booked').length

  const filtered = useMemo(() =>
    classes.filter(c => c.day === selDay && (selType === 'All' || c.type === selType)),
    [classes, selDay, selType]
  )

  const handleBook = async (cls) => {
    if (!canAccess(cls.type)) return
    const existing = bookings.find(b => b.class_id === cls.id && b.status !== 'cancelled')

    if (existing) {
      // Cancel booking
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', existing.id)
      setBookings(prev => prev.filter(b => b.id !== existing.id))
    } else {
      // Create booking
      const { data, error } = await supabase.from('bookings').insert({
        class_id: cls.id,
        member_id: profile.id,
        status: 'booked',
      }).select().single()

      if (data) setBookings(prev => [...prev, data])
    }
    setModal(null)
  }

  if (loading) {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>
        Loading classes...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 24px' }}>
        Classes
      </h1>

      {/* Day Picker */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 16, background: '#FFFFFF',
        borderRadius: 12, padding: 3, border: '1px solid rgba(0,0,0,0.06)',
      }}>
        {DAYS.map(d => (
          <button key={d} onClick={() => setSelDay(d)} style={{
            flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none',
            background: selDay === d ? '#007AFF' : 'transparent',
            color: selDay === d ? '#fff' : '#8E8E93',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: 'inherit', minWidth: 32,
          }}>
            {d}
            {d === todayDay && (
              <div style={{
                width: 4, height: 4, borderRadius: 2,
                background: selDay === d ? '#fff' : '#007AFF',
                margin: '3px auto 0',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {CLS_TYPES.map(t => (
          <button key={t} onClick={() => setSelType(t)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: '1px solid ' + (selType === t ? (tc[t] || '#007AFF') + '30' : 'rgba(0,0,0,0.06)'),
            background: selType === t ? (tc[t] || '#007AFF') + '0A' : 'transparent',
            color: selType === t ? (tc[t] || '#1C1C1E') : '#8E8E93',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Class List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8E8E93' }}>
            No classes on {selDay}
          </div>
        ) : filtered.map(cls => {
          const tr = getTrainer(cls.trainer_id)
          const ok = canAccess(cls.type)
          const bd = isBooked(cls.id)
          const spots = cls.capacity

          return (
            <div
              key={cls.id}
              onClick={() => ok && setModal(cls)}
              style={{
                background: '#FFFFFF',
                border: '1px solid ' + (bd ? '#34C75920' : 'rgba(0,0,0,0.06)'),
                borderRadius: 14, padding: '16px 18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                cursor: ok ? 'pointer' : 'default',
                opacity: ok ? 1 : 0.35,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Bdg text={cls.type} color={tc[cls.type]} />
                    {bd && <Bdg text="Booked" color="#34C759" />}
                  </div>
                  <h3 style={{ color: '#1C1C1E', margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>
                    {tr.name}
                  </h3>
                  <div style={{ display: 'flex', gap: 12, color: '#8E8E93', fontSize: 13 }}>
                    <span>{cls.time}</span>
                    <span>{cls.duration} min</span>
                    <span>{spots} spots</span>
                  </div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: 11,
                  background: (tc[cls.type] || '#007AFF') + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#636366',
                }}>
                  {initials(tr.name)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Class Detail Modal */}
      {modal && (() => {
        const tr = getTrainer(modal.trainer_id)
        const bd = isBooked(modal.id)

        return (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <Bdg text={modal.type} color={tc[modal.type]} />
                  <h2 style={{ color: '#1C1C1E', margin: '8px 0 4px', fontSize: 22, fontWeight: 700 }}>
                    {modal.type}
                  </h2>
                  <p style={{ color: '#3A3A3C', margin: 0, fontSize: 14 }}>with {tr.name}</p>
                </div>
                <button onClick={() => setModal(null)} style={{
                  background: '#F2F2F7', border: 'none', color: '#8E8E93',
                  width: 32, height: 32, borderRadius: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  ✕
                </button>
              </div>

              <p style={{ color: '#8E8E93', margin: '0 0 20px', fontSize: 14, lineHeight: 1.5 }}>
                {tr.bio}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
                {[
                  ['Day & Time', modal.day + ', ' + modal.time],
                  ['Duration', modal.duration + ' min'],
                  ['Capacity', modal.capacity + ' spots'],
                  ['Trainer', tr.name],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12 }}>
                    <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
                      {l}
                    </div>
                    <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleBook(modal)}
                style={{
                  width: '100%', padding: 16, borderRadius: 14, border: 'none',
                  background: bd ? '#F2F2F7' : '#007AFF',
                  color: bd ? '#FF3B30' : '#fff',
                  fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {bd ? 'Cancel Booking' : 'Book Class'}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
