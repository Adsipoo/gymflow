'use client'

import { useState, useEffect } from 'react'
import { useUser } from './layout'

export default function DashboardHome() {
  const { profile, gym, supabase } = useUser()
  const [upcomingBookings, setUpcomingBookings] = useState([])
  const [classes, setClasses] = useState([])
  const [trainers, setTrainers] = useState([])
  const [classTypes, setClassTypes] = useState([])
  const [typeImages, setTypeImages] = useState({})
  const [loadingBookings, setLoadingBookings] = useState(true)

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?'

  useEffect(() => {
    if (!profile || !gym?.id) return
    async function load() {
      const [bkRes, clsRes, trRes, ctRes, imgRes] = await Promise.all([
        supabase.from('bookings').select('*').eq('member_id', profile.id).in('status', ['booked', 'checked_in']).order('booked_at', { ascending: false }).limit(3),
        supabase.from('classes').select('*').eq('gym_id', gym.id),
        supabase.from('trainers').select('*'),
        supabase.from('class_types').select('name, color').eq('gym_id', gym.id),
        supabase.from('class_type_images').select('class_type, image_url').eq('gym_id', gym.id),
      ])
      setUpcomingBookings(bkRes.data || [])
      setClasses(clsRes.data || [])
      setTrainers(trRes.data || [])
      setClassTypes(ctRes.data || [])
      const imgMap = {}
      for (const r of imgRes.data || []) imgMap[r.class_type] = r.image_url
      setTypeImages(imgMap)
      setLoadingBookings(false)
    }
    load()
  }, [profile, gym?.id])

  const getClass = (id) => classes.find(c => c.id === id)
  const getTrainer = (id) => trainers.find(t => t.id === id) || { name: 'TBA' }
  const getColor = (type) => classTypes.find(ct => ct.name === type)?.color || '#007AFF'
  const getImg = (type) => typeImages[type] || null

  return (
    <div style={{ padding: '24px 20px 100px', maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', letterSpacing: -0.5, margin: '0 0 4px' }}>
        Welcome, {profile?.full_name?.split(' ')[0] || 'there'}
      </h1>
      <p style={{ color: '#8E8E93', fontSize: 14, margin: '0 0 28px' }}>
        {gym?.tagline || 'Your fitness journey starts here'}
      </p>

      {/* Profile Card */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18,
            background: '#007AFF15', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#636366',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{profile?.full_name}</div>
            <div style={{ fontSize: 14, color: '#8E8E93' }}>{profile?.email}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Status', profile?.status || '—'],
            ['Classes', String(profile?.classes_attended || 0)],
            ['Member since', profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString() : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12 }}>
              <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{label}</div>
              <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Classes */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 20,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>Upcoming Classes</div>
          <a href="/dashboard/bookings" style={{ fontSize: 13, color: '#007AFF', fontWeight: 600, textDecoration: 'none' }}>See all</a>
        </div>

        {loadingBookings ? (
          <div style={{ color: '#8E8E93', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Loading...</div>
        ) : upcomingBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ color: '#8E8E93', fontSize: 13, margin: '0 0 12px' }}>No upcoming classes booked</p>
            <a href="/dashboard/schedule" style={{
              display: 'inline-block', padding: '10px 20px', borderRadius: 10,
              background: '#007AFF', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>Browse Classes</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingBookings.map(bk => {
              const cls = getClass(bk.class_id)
              if (!cls) return null
              const tr = getTrainer(cls.trainer_id)
              const color = getColor(cls.type)
              const img = getImg(cls.type)
              return (
                <a key={bk.id} href="/dashboard/bookings" style={{
                  display: 'flex', alignItems: 'stretch',
                  borderRadius: 12, overflow: 'hidden', textDecoration: 'none',
                  border: '1px solid rgba(0,0,0,0.06)', background: '#F9F9F9',
                }}>
                  {img ? (
                    <div style={{ width: 56, flexShrink: 0 }}>
                      <img src={img} alt={cls.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: 5, flexShrink: 0, background: color, borderRadius: '12px 0 0 12px' }} />
                  )}
                  <div style={{ flex: 1, padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>{cls.type}</div>
                    <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
                      {tr.name} · {cls.day} · {cls.time}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#C7C7CC"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 20,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Browse Classes', '/dashboard/schedule', '#007AFF'],
            ['My Bookings', '/dashboard/bookings', '#5856D6'],
            ['View Progress', '/dashboard/progress', '#34C759'],
          ].map(([label, href, color]) => (
            <a key={label} href={href} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 12, background: color + '08',
              border: '1px solid ' + color + '15', textDecoration: 'none',
              color, fontSize: 14, fontWeight: 600,
            }}>
              {label}
              <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}