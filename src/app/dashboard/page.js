'use client'

import { useUser } from './layout'

export default function DashboardHome() {
  const { profile, gym } = useUser()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : '?'

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
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>
              {profile?.full_name}
            </div>
            <div style={{ fontSize: 14, color: '#8E8E93' }}>{profile?.email}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Tier', profile?.tier === 'allAccess' ? 'All-Access' : profile?.tier || '—'],
            ['Status', profile?.status || '—'],
            ['Classes', String(profile?.classes_attended || 0)],
            ['Member since', profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString() : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#F2F2F7', padding: '12px 14px', borderRadius: 12 }}>
              <div style={{ color: '#8E8E93', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ color: '#1C1C1E', fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, padding: 20,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E', marginBottom: 12 }}>
          Quick Actions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Browse Classes', '/dashboard/schedule', '#007AFF'],
            ['My Bookings', '/dashboard/bookings', '#5856D6'],
            ['View Progress', '/dashboard/progress', '#34C759'],
          ].map(([label, href, color]) => (
            <a
              key={label}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 12, background: color + '08',
                border: '1px solid ' + color + '15', textDecoration: 'none',
                color: color, fontSize: 14, fontWeight: 600,
              }}
            >
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
