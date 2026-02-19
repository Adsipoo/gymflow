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
    const { tierId, gymId, userId } = await req.json()

    // 1. Get the tier details
    const { data: tier, error: tierError } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('id', tierId)
      .single()

    if (tierError || !tier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    // 2. Get the gym details (for trial days and slug)
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', gymId)
      .single()

    if (gymError || !gym) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
    }

    // 3. Get the user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // 4. Get or create Stripe customer
    let stripeCustomerId = profile?.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name,
        metadata: { userId, gymId }
      })
      stripeCustomerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId)
    }

    // 5. Create or reuse Stripe Price for this tier
    let stripePriceId = tier.stripe_price_id

    if (!stripePriceId) {
      const product = await stripe.products.create({
        name: `${gym.name} — ${tier.name}`,
        metadata: { tierId, gymId }
      })

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price_cents,
        currency: tier.currency || 'aud',
        recurring: { interval: 'month' },
        metadata: { tierId, gymId }
      })

      stripePriceId = price.id

      await supabase
        .from('membership_tiers')
        .update({ stripe_price_id: stripePriceId })
        .eq('id', tierId)
    }

    // 6. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: stripePriceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: gym.trial_days || 0,
        metadata: { userId, gymId, tierId }
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/venues?joined=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/venues/${gym.slug}`,
      metadata: { userId, gymId, tierId }
    })

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}