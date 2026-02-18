'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '../layout'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })
const todayDay = DAYS.includes(today) ? today : 'Mon'

function Bdg({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '14', padding: '3px 8px', borderRadius: 6 }}>{text}</span>
}

async function sendEmail(type, to, data) {
  try {
    await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, to, data }) })
  } catch (err) { console.error('Email send failed:', err) }
}

export default function SchedulePage() {
  const { profile, gym, membership, supabase } = useUser()
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [classTypes, setClassTypes] = useState([])
  const [typeImages, setTypeImages] = useState({})
  const [allowedTypes, setAllowedTypes] = useState(null)
  const [bookings, setBookings] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [allWaitlist, setAllWaitlist] = useState([])
  const [selDay, setSelDay] = useState(todayDay)
  const [selType, setSelType] = useState('All')
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  // Reminder toggle state per booking action
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [justBooked, setJustBooked] = useState(null) // class id of most recent booking

  useEffect(() => {
    if (!profile || !gym?.id) return
    async function load() {
      const [clsRes, trRes, ctRes, imgRes, bkRes, abRes, wlRes, awlRes] = await Promise.all([
        supabase.from('classes').select('*').eq('gym_id', gym.id).order('time'),
        supabase.from('trainers').select('*'),
        supabase.from('class_types').select('name, color').eq('gym_id', gym.id),
        supabase.from('class_type_images').select('class_type, image_url').eq('gym_id', gym.id),
        supabase.from('bookings').select('*').eq('member_id', profile.id).in('status', ['booked', 'checked_in']),
        supabase.from('bookings').select('class_id, status').in('status', ['booked', 'checked_in']),
        supabase.from('waitlist').select('*').eq('member_id', profile.id).eq('status', 'waiting'),
        supabase.from('waitlist').select('class_id, member_id, status').eq('status', 'waiting'),
      ])
      setClasses(clsRes.data || [])
      setTrainers(trRes.data || [])
      setClassTypes(ctRes.data || [])
      const imgMap = {}
      for (const r of imgRes.data || []) imgMap[r.class_type] = r.image_url
      setTypeImages(imgMap)
      setBookings(bkRes.data || [])
      setAllBookings(abRes.data || [])
      setWaitlist(wlRes.data || [])
      setAllWaitlist(awlRes.data || [])

      if (membership?.tier_id) {
        const { data: tierTypes } = await supabase
          .from('tier_class_types').select('class_type').eq('tier_id', membership.tier_id)
        if (tierTypes?.length) setAllowedTypes(new Set(tierTypes.map(r => r.class_type)))
      }
      setLoading(false)
    }
    load()
  }, [profile, gym?.id])

  const getTrainer = (id) => trainers.find(t => t.id === id) || { name: 'TBA', specialty: '' }
  const getTypeColor = (name) => classTypes.find(ct => ct.name === name)?.color || '#8E8E93'
  const getTypeImage = (name) => typeImages[name] || null
  const canAccess = (type) => !allowedTypes || allowedTypes.has(type)
  const isBooked = (cid) => bookings.some(b => b.class_id === cid)
  const isOnWaitlist = (cid) => waitlist.some(w => w.class_id === cid)
  const waitlistCount = (cid) => allWaitlist.filter(w => w.class_id === cid).length
  const spotsLeft = (cid, cap) => cap - allBookings.filter(b => b.class_id === cid).length
  const typeNames = ['All', ...classTypes.map(ct => ct.name)]

  const filtered = useMemo(() =>
    classes.filter(c => c.day === selDay && (selType === 'All' || c.type === selType)),
    [classes, selDay, selType]
  )

  const handleBook = async (cls) => {
    const existing = bookings.find(b => b.class_id === cls.id)
    const tr = getTrainer(cls.trainer_id)
    const gymName = gym?.name || 'Humanitix Wellness'

    if (existing) {
      await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', existing.id)
      setBookings(prev => prev.filter(b => b.id !== existing.id))
      setAllBookings(prev => { const i = prev.findIndex(b => b.class_id === cls.id); return i === -1 ? prev : [...prev.slice(0, i), ...prev.slice(i + 1)] })
      sendEmail('bookingCancelled', profile.email, { memberName: profile.full_name, className: cls.type, day: cls.day, time: cls.time, gymName })

      const firstWaiting = allWaitlist.find(w => w.class_id === cls.id && w.member_id !== profile.id)
      if (firstWaiting) {
        const { data: wp } = await supabase.from('profiles').select('email, full_name').eq('id', firstWaiting.member_id).single()
        if (wp) {
          sendEmail('waitlistSpotAvailable', wp.email, { memberName: wp.full_name, className: cls.type, trainer: tr.name, day: cls.day, time: cls.time, gymName })
          await supabase.from('waitlist').update({ status: 'notified' }).eq('class_id', cls.id).eq('member_id', firstWaiting.member_id).eq('status', 'waiting')
        }
      }
      setJustBooked(null)
      setModal(null)
    } else {
      if (spotsLeft(cls.id, cls.capacity) <= 0) return
      const { data } = await supabase.from('bookings').insert({
        class_id: cls.id,
        member_id: profile.id,
        status: 'booked',
        reminder_enabled: reminderEnabled,
      }).select().single()
      if (data) {
        setBookings(prev => [...prev, data])
        setAllBookings(prev => [...prev, { class_id: cls.id, status: 'booked' }])
        sendEmail('bookingConfirmed', profile.email, { memberName: profile.full_name, className: cls.type, trainer: tr.name, day: cls.day, time: cls.time, gymName })
        setJustBooked(cls.id)
      }
    }
  }

  const handleWaitlist = async (cls) => {
    const existing = waitlist.find(w => w.class_id === cls.id)
    if (existing) {
      await supabase.from('waitlist').delete().eq('id', existing.id)
      setWaitlist(prev => prev.filter(w => w.id !== existing.id))
      setAllWaitlist(prev => prev.filter(w => !(w.class_id === cls.id && w.member_id === profile.id)))
    } else {
      const { data } = await supabase.from('waitlist').insert({ class_id: cls.id, member_id: profile.id, status: 'waiting' }).select().single()
      if (data) {
        setWaitlist(prev => [...prev, data])
        setAllWaitlist(prev => [...prev, { class_id: cls.id, member_id: profile.id, status: 'waiting' }])
      }
    }
    setModal(null)
  }

  const handleCloseModal = () => { setModal(null); setJustBooked(null); setReminderEnabled(true) }

  if (loading) return <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>Loading classes...</div>

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 24px' }}>Classes</h1>

      {/* Day Picker */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#FFFFFF', borderRadius: 12, padding: 3, border: '1px solid rgba(0,0,0,0.06)' }}>
        {DAYS.map(d => (
          <button key={d} onClick={() => setSelDay(d)} style={{
            flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none',
            background: selDay === d ? '#007AFF' : 'transparent',
            color: selDay === d ? '#fff' : '#8E8E93',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', minWidth: 32,
          }}>
            {d}
            {d === todayDay && <div style={{ width: 4, height: 4, borderRadius: 2, background: selDay === d ? '#fff' : '#007AFF', margin: '3px auto 0' }} />}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {typeNames.map(t => {
          const color = getTypeColor(t)
          const active = selType === t
          return (
            <button key={t} onClick={() => setSelType(t)} style={{
              padding: '6px 14px', borderRadius: 20,
              border: '1px solid ' + (active ? color + '30' : 'rgba(0,0,0,0.06)'),
              background: active ? color + '0A' : 'transparent',
              color: active ? color : '#8E8E93',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}>{t}</button>
          )
        })}
      </div>

      {/* Class List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#8E8E93' }}>No classes on {selDay}</div>
        ) : filtered.map(cls => {
          const tr = getTrainer(cls.trainer_id)
          const ok = canAccess(cls.type)
          const bd = isBooked(cls.id)
          const onWl = isOnWaitlist(cls.id)
          const remaining = spotsLeft(cls.id, cls.capacity)
          const full = remaining <= 0 && !bd
          const wlCount = waitlistCount(cls.id)
          const color = getTypeColor(cls.type)
          const img = getTypeImage(cls.type)

          return (
            <div key={cls.id} onClick={() => ok && setModal(cls)} style={{
              background: '#FFFFFF',
              border: '1px solid ' + (bd ? '#34C75920' : onWl ? '#FF950020' : full ? '#FF3B3015' : 'rgba(0,0,0,0.06)'),
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              cursor: ok ? 'pointer' : 'default', opacity: ok ? 1 : 0.35,
              display: 'flex', alignItems: 'stretch',
            }}>
              {img ? (
                <div style={{ width: 72, flexShrink: 0, overflow: 'hidden' }}>
                  <img src={img} alt={cls.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: 6, flexShrink: 0, background: color }} />
              )}
              <div style={{ flex: 1, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Bdg text={cls.type} color={color} />
                  {bd && <Bdg text="Booked" color="#34C759" />}
                  {onWl && <Bdg text="Waitlisted" color="#FF9500" />}
                  {full && !bd && !onWl && <Bdg text="Full" color="#FF3B30" />}
                </div>
                <h3 style={{ color: '#1C1C1E', margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>{tr.name}</h3>
                <div style={{ display: 'flex', gap: 12, color: '#8E8E93', fontSize: 13, flexWrap: 'wrap' }}>
                  <span>{cls.time}</span>
                  <span>{cls.duration} min</span>
                  <span style={{ color: remaining <= 3 && remaining > 0 ? '#FF9500' : remaining <= 0 ? '#FF3B30' : '#8E8E93' }}>
                    {remaining}/{cls.capacity} spots
                  </span>
                  {wlCount > 0 && <span style={{ color: '#FF9500' }}>{wlCount} waiting</span>}
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
        const color = getTypeColor(modal.type)
        const img = getTypeImage(modal.type)
        const showReminderToggle = justBooked === modal.id

        return (
          <div onClick={handleCloseModal} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#FFFFFF', borderRadius: 20,
              maxWidth: 460, width: '100%', border: '1px solid rgba(0,0,0,0.06)',
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
            }}>
              {img && (
                <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                  <img src={img} alt={modal.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4))' }} />
                </div>
              )}

              <div style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <Bdg text={modal.type} color={color} />
                    <h2 style={{ color: '#1C1C1E', margin: '8px 0 4px', fontSize: 22, fontWeight: 700 }}>{modal.type}</h2>
                    <p style={{ color: '#3A3A3C', margin: 0, fontSize: 14 }}>with {tr.name}</p>
                  </div>
                  <button onClick={handleCloseModal} style={{
                    background: '#F2F2F7', border: 'none', color: '#8E8E93',
                    width: 32, height: 32, borderRadius: 10, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>✕</button>
                </div>

                {tr.bio && <p style={{ color: '#8E8E93', margin: '0 0 20px', fontSize: 14, lineHeight: 1.5 }}>{tr.bio}</p>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
                  {[
                    ['Day & Time', modal.day + ', ' + modal.time],
                    ['Duration', modal.duration + ' min'],
                    ['Spots Left', remaining + '/' + modal.capacity],
                    ['Waitlist', wlCount > 0 ? wlCount + ' waiting' : 'No one waiting'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12 }}>
                      <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>{l}</div>
                      <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Reminder toggle — shown after booking */}
                {showReminderToggle && (
                  <div style={{
                    background: '#F2F2F7', borderRadius: 14, padding: '14px 16px',
                    marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>24-hour reminder</div>
                      <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>Get an email reminder before class</div>
                    </div>
                    <button onClick={async () => {
                      const newVal = !reminderEnabled
                      setReminderEnabled(newVal)
                      const booking = bookings.find(b => b.class_id === modal.id)
                      if (booking) await supabase.from('bookings').update({ reminder_enabled: newVal }).eq('id', booking.id)
                    }} style={{
                      width: 48, height: 28, borderRadius: 14, border: 'none',
                      background: reminderEnabled ? '#34C759' : '#C7C7CC',
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3,
                        left: reminderEnabled ? 23 : 3,
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </div>
                )}

                {bd ? (
                  <button onClick={() => handleBook(modal)} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: '#F2F2F7', color: '#FF3B30', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel Booking</button>
                ) : remaining > 0 ? (
                  <button onClick={() => handleBook(modal)} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: '#007AFF', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Book Class</button>
                ) : onWl ? (
                  <button onClick={() => handleWaitlist(modal)} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: '#FF950015', color: '#FF9500', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Leave Waitlist</button>
                ) : (
                  <button onClick={() => handleWaitlist(modal)} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: '#FF9500', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Join Waitlist</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}