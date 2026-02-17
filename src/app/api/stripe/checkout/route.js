import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const TIER_PRICES = {
  basic:     { amount: 2900,  name: 'Basic Plan — $29/mo' },
  premium:   { amount: 5900,  name: 'Premium Plan — $59/mo' },
  allAccess: { amount: 9900,  name: 'All-Access Plan — $99/mo' },
}

export async function POST(req) {
  try {
    const { tier, userId, userEmail } = await req.json()

    if (!TIER_PRICES[tier]) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const price = TIER_PRICES[tier]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: { name: price.name },
            unit_amount: price.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        tier,
      },
      success_url: `${appUrl}/dashboard/account?payment=success&tier=${tier}`,
      cancel_url: `${appUrl}/dashboard/account?payment=cancelled`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
