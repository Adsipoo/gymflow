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
    const { userId, gymId, newTierId } = await req.json()

    // 1. Get the current gym membership
    const { data: membership, error: membershipError } = await supabase
      .from('gym_memberships')
      .select('*')
      .eq('member_id', userId)
      .eq('gym_id', gymId)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    }

    // 2. Get the new tier
    const { data: newTier, error: tierError } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('id', newTierId)
      .single()

    if (tierError || !newTier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    // 3. Get the gym for currency
    const { data: gym } = await supabase
      .from('gyms')
      .select('name')
      .eq('id', gymId)
      .single()

    // 4. Ensure the new tier has a Stripe price
    let stripePriceId = newTier.stripe_price_id
    if (!stripePriceId) {
      const product = await stripe.products.create({
        name: `${gym.name} — ${newTier.name}`,
        metadata: { tierId: newTierId, gymId }
      })
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: newTier.price_cents,
        currency: newTier.currency || 'aud',
        recurring: { interval: 'month' },
        metadata: { tierId: newTierId, gymId }
      })
      stripePriceId = price.id
      await supabase
        .from('membership_tiers')
        .update({ stripe_price_id: stripePriceId })
        .eq('id', newTierId)
    }

    // 5. Get the Stripe subscription and update it
    const subscription = await stripe.subscriptions.retrieve(membership.stripe_subscription_id)
    const subscriptionItemId = subscription.items.data[0].id

    await stripe.subscriptions.update(membership.stripe_subscription_id, {
      items: [{ id: subscriptionItemId, price: stripePriceId }],
      proration_behavior: 'create_prorations',
      metadata: { userId, gymId, tierId: newTierId }
    })

    // 6. Update gym_membership with new tier
    await supabase
      .from('gym_memberships')
      .update({ tier_id: newTierId })
      .eq('id', membership.id)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Change plan error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}