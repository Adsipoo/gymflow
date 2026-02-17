'use client'

import { useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  const handleEmail = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      // Create profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: 'member',
          tier: 'basic',
          status: 'pending',
        })
      }
      router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      router.push('/dashboard')
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F2F2F7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      padding: 20,
    }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#8E8E93',
            letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
          }}>
            GymFlow
          </div>
          <div style={{
            fontSize: 32, fontWeight: 700, color: '#1C1C1E',
            letterSpacing: -0.5, lineHeight: 1.2,
          }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </div>
          <div style={{
            width: 32, height: 2, background: '#007AFF',
            margin: '16px auto', borderRadius: 1,
          }} />
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: 32,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.1)',
              background: '#fff',
              color: '#1C1C1E',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontFamily: 'inherit',
              marginBottom: 24,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.99-.15-1.17z" fill="#4285F4"/>
              <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" fill="#34A853"/>
              <path d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" fill="#FBBC05"/>
              <path d="M8.98 3.58c1.32 0 2.21.57 2.72 1.05l2.04-1.99A7.96 7.96 0 008.98 0 8 8 0 001.83 5.41L4.5 7.48a4.77 4.77 0 014.48-3.9z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            marginBottom: 24, color: '#8E8E93', fontSize: 13,
          }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
            or
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{
                  padding: '14px 16px', borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
                  color: '#1C1C1E', fontSize: 15, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '14px 16px', borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
                color: '#1C1C1E', fontSize: 15, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                padding: '14px 16px', borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.08)', background: '#F2F2F7',
                color: '#1C1C1E', fontSize: 15, outline: 'none',
                fontFamily: 'inherit',
              }}
            />

            {error && (
              <div style={{
                color: '#FF3B30', fontSize: 13, padding: '10px 14px',
                background: '#FF3B3010', borderRadius: 10,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: 16, borderRadius: 14, border: 'none',
                background: '#007AFF', color: '#fff', fontSize: 16,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                marginTop: 4, opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle mode */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
              style={{
                background: 'none', border: 'none', color: '#007AFF',
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
