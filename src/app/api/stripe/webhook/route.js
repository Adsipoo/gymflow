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

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        const { userId, gymId, tierId } = session.metadata
        console.log('Session metadata:', session.metadata)
        console.log('Session subscription:', session.subscription)

        if (!userId || !gymId || !tierId) {
          console.log('Missing metadata — skipping (old payment flow)')
          break
        }

        const subscriptionId = session.subscription
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null
        const status = subscription.status

        const { error: membershipError } = await supabase
          .from('gym_memberships')
          .upsert({
            gym_id: gymId,
            member_id: userId,
            tier_id: tierId,
            stripe_subscription_id: subscriptionId,
            status,
            trial_ends_at: trialEnd,
            current_period_end: periodEnd
          }, { onConflict: 'gym_id,member_id' })

        if (membershipError) console.error('Membership upsert error:', membershipError)

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ status: 'active', onboarding_complete: true })
          .eq('id', userId)

        if (profileError) console.error('Profile update error:', profileError)

        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            member_id: userId,
            gym_id: gymId,
            amount: session.amount_total || 0,
            status: 'succeeded'
          })

        if (paymentError) console.error('Payment insert error:', paymentError)

        console.log(`✅ Checkout complete: ${userId} joined gym ${gymId} on tier ${tierId} (${status})`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const { userId, gymId, tierId } = subscription.metadata || {}

        if (!userId || !gymId) {
          console.log('No metadata on subscription.updated — skipping')
          break
        }

        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null

        const { error } = await supabase
          .from('gym_memberships')
          .update({
            status: subscription.status,
            trial_ends_at: trialEnd,
            current_period_end: periodEnd,
            ...(tierId && { tier_id: tierId }),
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) console.error('Membership update error:', error)
        console.log(`🔄 Subscription updated: ${subscription.id} → ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        const { error } = await supabase
          .from('gym_memberships')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', subscription.id)

        if (error) console.error('Membership cancel error:', error)
        console.log(`❌ Subscription cancelled: ${subscription.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription

        const { error } = await supabase
          .from('gym_memberships')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId)

        if (error) console.error('Payment failed update error:', error)
        console.log(`⚠️ Payment failed for subscription: ${subscriptionId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return Response.json({ received: true })
}