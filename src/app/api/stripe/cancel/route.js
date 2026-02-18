import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { userId, gymId } = await req.json()

    // 1. Get the membership
    const { data: membership, error } = await supabase
      .from('gym_memberships')
      .select('*')
      .eq('member_id', userId)
      .eq('gym_id', gymId)
      .single()

    if (error || !membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    }

    // 2. Cancel at period end in Stripe (member keeps access until then)
    await stripe.subscriptions.update(membership.stripe_subscription_id, {
      cancel_at_period_end: true
    })

    // 3. Update membership status in Supabase
    await supabase
      .from('gym_memberships')
      .update({ status: 'cancelled' })
      .eq('id', membership.id)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Cancel error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}