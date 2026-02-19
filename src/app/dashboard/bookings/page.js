'use client'

import { useState, useEffect } from 'react'
import { useUser } from '../layout'

function Bdg({ text, color }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '14', padding: '3px 8px', borderRadius: 6 }}>{text}</span>
}

function initials(n) {
  if (!n) return '?'
  const p = n.split(' ')
  return p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)
}

export default function BookingsPage() {
  const { profile, supabase } = useUser()
  const [bookings, setBookings] = useState([])
  const [classMap, setClassMap] = useState({})
  const [gymMap, setGymMap] = useState({})
  const [trainers, setTrainers] = useState([])
  const [reviews, setReviews] = useState([])
  const [colorMap, setColorMap] = useState({})
  const [imageMap, setImageMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [reviewModal, setReviewModal] = useState(null)
  const [revRating, setRevRating] = useState(0)
  const [revComment, setRevComment] = useState('')

  useEffect(() => {
    if (!profile) return
    async function load() {
      // 1. Get all gyms this member belongs to
      const { data: memberships } = await supabase
        .from('gym_memberships')
        .select('gym_id, gyms:gym_id(id, name)')
        .eq('member_id', profile.id)
        .in('status', ['active', 'trialing'])

      const gymIds = (memberships || []).map(m => m.gym_id)
      const gMap = {}
      for (const m of memberships || []) gMap[m.gym_id] = m.gyms?.name || 'Unknown Venue'
      setGymMap(gMap)

      // 2. Fetch all data in parallel across all gyms
      const [bkRes, trRes, rvRes] = await Promise.all([
        supabase.from('bookings').select('*').eq('member_id', profile.id).order('booked_at', { ascending: false }),
        supabase.from('trainers').select('*'),
        supabase.from('reviews').select('*').eq('member_id', profile.id),
      ])

      let clsMap = {}, colMap = {}, imgMap = {}

      if (gymIds.length > 0) {
        const [clsRes, ctRes, imgRes] = await Promise.all([
          supabase.from('classes').select('*').in('gym_id', gymIds),
          supabase.from('class_types').select('name, color, gym_id').in('gym_id', gymIds),
          supabase.from('class_type_images').select('class_type, image_url, gym_id').in('gym_id', gymIds),
        ])

        for (const c of clsRes.data || []) clsMap[c.id] = c
        for (const ct of ctRes.data || []) colMap[`${ct.gym_id}:${ct.name}`] = ct.color
        for (const img of imgRes.data || []) imgMap[`${img.gym_id}:${img.class_type}`] = img.image_url
      }

      setBookings(bkRes.data || [])
      setClassMap(clsMap)
      setTrainers(trRes.data || [])
      setReviews(rvRes.data || [])
      setColorMap(colMap)
      setImageMap(imgMap)
      setLoading(false)
    }
    load()
  }, [profile])

  const getClass = (id) => classMap[id]
  const getTrainer = (id) => trainers.find(t => t.id === id) || { name: 'TBA' }
  const getColor = (gymId, type) => colorMap[`${gymId}:${type}`] || '#8E8E93'
  const getImg = (gymId, type) => imageMap[`${gymId}:${type}`] || null
  const getGymName = (gymId) => gymMap[gymId] || 'Unknown Venue'
  const hasReviewed = (cid) => reviews.some(r => r.class_id === cid)

  const handleCancel = async (bk) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bk.id)
    setBookings(prev => prev.map(b => b.id === bk.id ? { ...b, status: 'cancelled' } : b))
  }

  const handleReview = async () => {
    if (revRating === 0) return
    const cls = getClass(reviewModal.class_id)
    const { data } = await supabase.from('reviews').insert({
      class_id: reviewModal.class_id, member_id: profile.id,
      trainer_id: cls?.trainer_id, class_type: cls?.type,
      rating: revRating, comment: revComment.trim() || null,
    }).select().single()
    if (data) setReviews(prev => [...prev, data])
    setReviewModal(null); setRevRating(0); setRevComment('')
  }

  if (loading) return <div style={{ padding: '24px 20px', textAlign: 'center', color: '#8E8E93' }}>Loading...</div>

  const active = bookings.filter(b => b.status === 'booked' || b.status === 'checked_in')
  const completed = bookings.filter(b => b.status === 'completed')
  const cancelled = bookings.filter(b => b.status === 'cancelled')

  const sectionLabel = (text, top) => (
    <h3 style={{ color: '#8E8E93', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, margin: top ? '0 0 10px' : '24px 0 10px' }}>{text}</h3>
  )

  const BookingCard = ({ bk, showCancel, showReview }) => {
    const cls = getClass(bk.class_id)
    if (!cls) return null
    const tr = getTrainer(cls.trainer_id)
    const color = getColor(cls.gym_id, cls.type)
    const img = getImg(cls.gym_id, cls.type)
    const gymName = getGymName(cls.gym_id)
    const reviewed = hasReviewed(bk.class_id)
    const myRev = reviews.find(r => r.class_id === bk.class_id)

    return (
      <div style={{
        background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 14, marginBottom: 8, overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'stretch',
        opacity: bk.status === 'cancelled' ? 0.5 : 1,
      }}>
        {img ? (
          <div style={{ width: 64, flexShrink: 0 }}>
            <img src={img} alt={cls.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ width: 5, flexShrink: 0, background: color }} />
        )}
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
              <Bdg text={cls.type} color={color} />
              {bk.status === 'checked_in' && <Bdg text="Checked In" color="#34C759" />}
              {bk.status === 'booked' && <Bdg text="Booked" color="#34C759" />}
              {bk.status === 'cancelled' && <Bdg text="Cancelled" color="#8E8E93" />}
              {reviewed && <Bdg text="Reviewed" color="#FF9500" />}
              <Bdg text={gymName} color="#007AFF" />
            </div>
            <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600 }}>{tr.name}</div>
            <div style={{ color: '#8E8E93', fontSize: 12, marginTop: 2 }}>{cls.day} · {cls.time} · {cls.duration} min</div>
          </div>
          {showCancel && (
            <button onClick={() => handleCancel(bk)} style={{
              background: '#F2F2F7', border: 'none', color: '#FF3B30',
              padding: '8px 16px', borderRadius: 10, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}>Cancel</button>
          )}
          {showReview && !reviewed && (
            <button onClick={() => setReviewModal(bk)} style={{
              background: '#FF950010', border: 'none', color: '#FF9500',
              padding: '8px 16px', borderRadius: 10, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}>Review</button>
          )}
          {showReview && reviewed && myRev && (
            <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i <= myRev.rating ? '#FF9500' : '#D1D1D6'}>
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>Bookings</h1>
      <p style={{ color: '#8E8E93', fontSize: 14, margin: '0 0 24px' }}>
        {active.length} upcoming{completed.length ? ' · ' + completed.length + ' completed' : ''}
      </p>

      {bookings.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#D1D1D6" style={{ marginBottom: 16 }}>
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
          </svg>
          <p style={{ color: '#8E8E93', marginBottom: 20 }}>No bookings yet</p>
          <a href="/dashboard/schedule" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 12, background: '#007AFF', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Browse Classes</a>
        </div>
      )}

      {active.length > 0 && (
        <>
          {sectionLabel('Upcoming', true)}
          {active.map(bk => <BookingCard key={bk.id} bk={bk} showCancel />)}
        </>
      )}

      {completed.length > 0 && (
        <>
          {sectionLabel('Completed')}
          {completed.map(bk => <BookingCard key={bk.id} bk={bk} showReview />)}
        </>
      )}

      {cancelled.length > 0 && (
        <>
          {sectionLabel('Cancelled')}
          {cancelled.slice(0, 5).map(bk => <BookingCard key={bk.id} bk={bk} />)}
        </>
      )}

      {/* Review Modal */}
      {reviewModal && (() => {
        const cls = getClass(reviewModal.class_id)
        const tr = cls ? getTrainer(cls.trainer_id) : { name: 'Unknown' }
        const color = getColor(cls?.gym_id, cls?.type)
        const img = getImg(cls?.gym_id, cls?.type)
        return (
          <div onClick={() => { setReviewModal(null); setRevRating(0); setRevComment('') }} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#FFFFFF', borderRadius: 20,
              maxWidth: 460, width: '100%', border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden',
            }}>
              {img && (
                <div style={{ height: 120, overflow: 'hidden' }}>
                  <img src={img} alt={cls?.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: 28 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  {!img && (
                    <div style={{
                      width: 56, height: 56, borderRadius: 18, margin: '0 auto 12px',
                      background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: '#636366',
                    }}>{initials(tr.name)}</div>
                  )}
                  <h2 style={{ color: '#1C1C1E', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>How was {cls?.type}?</h2>
                  <p style={{ color: '#8E8E93', margin: 0, fontSize: 14 }}>with {tr.name}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} onClick={() => setRevRating(i)} style={{ cursor: 'pointer' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill={i <= revRating ? '#FF9500' : '#D1D1D6'}>
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    </span>
                  ))}
                </div>
                <textarea value={revComment} onChange={e => setRevComment(e.target.value)}
                  placeholder="Share your experience (optional)"
                  style={{
                    width: '100%', padding: 14, borderRadius: 14,
                    border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
                    color: '#1C1C1E', fontSize: 14, outline: 'none',
                    resize: 'vertical', minHeight: 80, boxSizing: 'border-box',
                    fontFamily: 'inherit', marginBottom: 20,
                  }}
                />
                <button onClick={handleReview} disabled={revRating === 0} style={{
                  width: '100%', padding: 16, borderRadius: 14, border: 'none',
                  background: revRating > 0 ? '#FF9500' : '#F2F2F7',
                  color: revRating > 0 ? '#fff' : '#8E8E93',
                  fontSize: 16, fontWeight: 600, cursor: revRating > 0 ? 'pointer' : 'default', fontFamily: 'inherit',
                }}>Submit Review</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}