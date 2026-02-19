'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useRouter, useParams, useSearchParams } from 'next/navigation'

const font = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"

export default function JoinCheckoutPage() {
  const { slug } = useParams()
  const searchParams = useSearchParams()
  const tierId = searchParams.get('tierId')
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    async function go() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        localStorage.setItem('joinSlug', slug)
        localStorage.setItem('joinTierId', tierId)
        router.push(`/login?return=/join/${slug}/checkout?tierId=${tierId}`)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, onboarding_complete')
        .eq('id', user.id)
        .single()

      // If not onboarded, do a minimal onboarding — just mark them as a member
      if (!profile?.onboarding_complete) {
        await supabase.from('profiles')
          .update({ role: 'member', onboarding_complete: true })
          .eq('id', user.id)
      }

      // Get gym id from slug
      const { data: venue } = await supabase
        .from('gyms')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!venue) { router.push('/dashboard'); return }

      // Check if already a member
      const { data: existing } = await supabase
        .from('gym_memberships')
        .select('id')
        .eq('member_id', user.id)
        .eq('gym_id', venue.id)
        .in('status', ['active', 'trialing'])
        .limit(1)

      if (existing?.length > 0) {
        localStorage.setItem('activeGymId', venue.id)
        localStorage.removeItem('joinSlug')
        localStorage.removeItem('joinTierId')
        router.push('/dashboard')
        return
      }

      // Kick off Stripe checkout
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, gymId: venue.id, userId: user.id }),
      })
      const { url, error } = await res.json()

      localStorage.removeItem('joinSlug')
      localStorage.removeItem('joinTierId')

      if (error || !url) { router.push(`/join/${slug}`); return }
      window.location.href = url
    }
    go()
  }, [slug, tierId])

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#8E8E93', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
          Setting up your membership...
        </div>
        <div style={{ color: '#8E8E93', fontSize: 14 }}>You'll be redirected to checkout shortly</div>
      </div>
    </div>
  )
}