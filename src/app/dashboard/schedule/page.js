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

async function sendEmail(type, to, data) {
  try {
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, data }),
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }
}

export default function SchedulePage() {
  const { profile, gym, supabase } = useUser()
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [bookings, setBookings] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [allWaitlist, setAllWaitlist] = useState([])
  const [selDay, setSelDay] = useState(todayDay)
  const [selType, setSelType] = useState('All')
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [clsRes, trRes, bkRes, abRes, wlRes, awlRes] = await Promise.all([
        supabase.from('classes').select('*').order('time'),
        supabase.from('trainers').select('*'),
        supabase.from('bookings').select('*').eq('member_id', profile.id).in('status', ['booked', 'checked_in']),
        supabase.from('bookings').select('class_id, status').in('status', ['booked', 'checked_in']),
        supabase.from('waitlist').select('*').eq('member_id', profile.id).eq('status', 'waiting'),
        supabase.from('waitlist').select('class_id, member_id, status').eq('status', 'waiting'),
      ])
      setClasses(clsRes.data || [])
      setTrainers(trRes.data || [])
      setBookings(bkRes.data || [])
      setAllBookings(abRes.data || [])
      setWaitlist(wlRes.data || [])
      setAllWaitlist(awlRes.data || [])
      setLoading(false)
    }
    if (profile) load()
  }, [profile])

  const getTrainer = (id) => trainers.find(t => t.id === id) || { name: 'TBA', specialty: '' }
  const canAccess = (type) => TIER_ACCESS[profile?.tier]?.includes(type)
  const isBooked = (classId) => bookings.some(b => b.class_id === classId && b.status !== 'cancelled')
  const isOnWaitlist = (classId) => waitlist.some(w => w.class_id === classId && w.status === 'waiting')
  const waitlistCount = (classId) => allWaitlist.filter(w => w.class_id === classId).length
  const spotsLeft = (classId, capacity) => {
    const booked = allBookings.filter(b => b.class_id === classId).length
    return capacity - booked
  }

  const filtered = useMemo(() =>
    classes.filter(c => c.day === selDay && (selType === 'All' || c.type === selType)),
    [classes, selDay, selType]
  )

  const handleBook = async (cls) => {
    if (!canAccess(cls.type)) return
    const existing = bookings.find(b => b.class_id === cls.id && b.status !== 'cancelled')
    const tr = getTrainer(cls.trainer_id)
    const gymName = gym?.name || 'GymFlow'

    if (existing) {
      // Cancel booking
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', existing.id)
      setBookings(prev => prev.filter(b => b.id !== existing.id))
      setAllBookings(prev => {
        const idx = prev.findIndex(b => b.class_id === cls.id)
        if (idx === -1) return prev
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
      })

      // Send cancellation email
      sendEmail('bookingCancelled', profile.email, {
        memberName: profile.full_name,
        className: cls.type,
        day: cls.day,
        time: cls.time,
        gymName,
      })

      // Notify first person on waitlist
      const firstWaiting = allWaitlist.find(w => w.class_id === cls.id && w.member_id !== profile.id)
      if (firstWaiting) {
        // Fetch their profile to get email
        const { data: waitingProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', firstWaiting.member_id)
          .single()

        if (waitingProfile) {
          sendEmail('waitlistSpotAvailable', waitingProfile.email, {
            memberName: waitingProfile.full_name,
            className: cls.type,
            trainer: tr.name,
            day: cls.day,
            time: cls.time,
            gymName,
          })

          // Mark them as notified
          await supabase
            .from('waitlist')
            .update({ status: 'notified' })
            .eq('class_id', cls.id)
            .eq('member_id', firstWaiting.member_id)
            .eq('status', 'waiting')
        }
      }
    } else {
      if (spotsLeft(cls.id, cls.capacity) <= 0) return

      const { data, error } = await supabase.from('bookings').insert({
        class_id: cls.id,
        member_id: profile.id,
        status: 'booked',
      }).select().single()

      if (data) {
        setBookings(prev => [...prev, data])
        setAllBookings(prev => [...prev, { class_id: cls.id, status: 'booked' }])

        sendEmail('bookingConfirmed', profile.email, {
          memberName: profile.full_name,
          className: cls.type,
          trainer: tr.name,
          day: cls.day,
          time: cls.time,
          gymName,
        })
      }
    }
    setModal(null)
  }

  const handleWaitlist = async (cls) => {
    const existing = waitlist.find(w => w.class_id === cls.id && w.status === 'waiting')

    if (existing) {
      // Leave waitlist
      await supabase.from('waitlist').delete().eq('id', existing.id)
      setWaitlist(prev => prev.filter(w => w.id !== existing.id))
      setAllWaitlist(prev => prev.filter(w => !(w.class_id === cls.id && w.member_id === profile.id)))
    } else {
      // Join waitlist
      const { data } = await supabase.from('waitlist').insert({
        class_id: cls.id,
        member_id: profile.id,
        status: 'waiting',
      }).select().single()

      if (data) {
        setWaitlist(prev => [...prev, data])
        setAllWaitlist(prev => [...prev, { class_id: cls.id, member_id: profile.id, status: 'waiting' }])
      }
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
          const onWl = isOnWaitlist(cls.id)
          const remaining = spotsLeft(cls.id, cls.capacity)
          const full = remaining <= 0 && !bd
          const wlCount = waitlistCount(cls.id)

          return (
            <div
              key={cls.id}
              onClick={() => ok && setModal(cls)}
              style={{
                background: '#FFFFFF',
                border: '1px solid ' + (bd ? '#34C75920' : onWl ? '#FF950020' : full ? '#FF3B3015' : 'rgba(0,0,0,0.06)'),
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
                    {onWl && <Bdg text="Waitlisted" color="#FF9500" />}
                    {full && !bd && !onWl && <Bdg text="Full" color="#FF3B30" />}
                  </div>
                  <h3 style={{ color: '#1C1C1E', margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>
                    {tr.name}
                  </h3>
                  <div style={{ display: 'flex', gap: 12, color: '#8E8E93', fontSize: 13 }}>
                    <span>{cls.time}</span>
                    <span>{cls.duration} min</span>
                    <span style={{ color: remaining <= 3 && remaining > 0 ? '#FF9500' : remaining <= 0 ? '#FF3B30' : '#8E8E93' }}>
                      {remaining}/{cls.capacity} spots
                    </span>
                    {wlCount > 0 && (
                      <span style={{ color: '#FF9500' }}>
                        {wlCount} waiting
                      </span>
                    )}
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
        const onWl = isOnWaitlist(modal.id)
        const remaining = spotsLeft(modal.id, modal.capacity)
        const wlCount = waitlistCount(modal.id)

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
                  ['Spots Left', remaining + '/' + modal.capacity],
                  ['Waitlist', wlCount > 0 ? wlCount + ' waiting' : 'No one waiting'],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12 }}>
                    <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>
                      {l}
                    </div>
                    <div style={{ color: l === 'Spots Left' && remaining <= 3 ? '#FF9500' : l === 'Waitlist' && wlCount > 0 ? '#FF9500' : '#1C1C1E', fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Main action button */}
              {bd ? (
                <button
                  onClick={() => handleBook(modal)}
                  style={{
                    width: '100%', padding: 16, borderRadius: 14, border: 'none',
                    background: '#F2F2F7', color: '#FF3B30',
                    fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel Booking
                </button>
              ) : remaining > 0 ? (
                <button
                  onClick={() => handleBook(modal)}
                  style={{
                    width: '100%', padding: 16, borderRadius: 14, border: 'none',
                    background: '#007AFF', color: '#fff',
                    fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Book Class
                </button>
              ) : onWl ? (
                <button
                  onClick={() => handleWaitlist(modal)}
                  style={{
                    width: '100%', padding: 16, borderRadius: 14, border: 'none',
                    background: '#FF950015', color: '#FF9500',
                    fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Leave Waitlist
                </button>
              ) : (
                <button
                  onClick={() => handleWaitlist(modal)}
                  style={{
                    width: '100%', padding: 16, borderRadius: 14, border: 'none',
                    background: '#FF9500', color: '#fff',
                    fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Join Waitlist
                </button>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}