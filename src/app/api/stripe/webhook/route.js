import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { userId, tier } = session.metadata
    const amount = session.amount_total

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ tier, status: 'active' })
      .eq('id', userId)

    if (profileErr) console.error('Profile update error:', profileErr)

    const { error: paymentErr } = await supabase
      .from('payments')
      .insert({
        member_id: userId,
        tier,
        amount,
        status: 'succeeded',
      })

    if (paymentErr) console.error('Payment insert error:', paymentErr)

    console.log(`✅ Payment succeeded: ${userId} → ${tier} ($${amount / 100})`)
  }

  return Response.json({ received: true })
}
