import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function buildHtml({ memberName, subject, message, gymName }) {
  return '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">'
    + '<div style="font-size: 11px; font-weight: 700; color: #8E8E93; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px;">' + gymName + '</div>'
    + '<h1 style="font-size: 22px; font-weight: 700; color: #1C1C1E; margin: 0 0 8px;">' + subject + '</h1>'
    + '<p style="font-size: 15px; color: #8E8E93; margin: 0 0 24px;">Hey ' + memberName + ',</p>'
    + '<div style="background: #F2F2F7; border-radius: 16px; padding: 20px; margin-bottom: 24px;">'
    + '<p style="font-size: 15px; color: #1C1C1E; margin: 0; line-height: 1.6;">' + message.replace(/\n/g, '<br>') + '</p>'
    + '</div>'
    + '<p style="font-size: 13px; color: #AEAEB2;">— The ' + gymName + ' team</p>'
    + '</div>'
}

export async function POST(req) {
  try {
    const { gymId, gymName, subject, message, audience, tierIds } = await req.json()
    if (!gymId || !subject || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let query = supabase
      .from('gym_memberships')
      .select('member_id, status, profiles(email, full_name)')
      .eq('gym_id', gymId)

    if (audience === 'active') query = query.eq('status', 'active')
    else if (audience === 'trialing') query = query.eq('status', 'trialing')
    else if (audience === 'tiers' && tierIds?.length) query = query.in('tier_id', tierIds)

    const { data: memberships, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Dedupe by member_id
    const seen = new Set()
    const members = []
    for (const m of memberships || []) {
      if (!seen.has(m.member_id) && m.profiles?.email) {
        seen.add(m.member_id)
        members.push(m.profiles)
      }
    }

    if (members.length === 0) {
      return Response.json({ sent: 0, failed: 0, total: 0, message: 'No members found for this audience' })
    }

    let sent = 0
    let failed = 0
    for (const member of members) {
      const { error: sendErr } = await resend.emails.send({
        from: gymName + ' <onboarding@resend.dev>',
        to: member.email,
        subject,
        html: buildHtml({
          memberName: member.full_name || 'there',
          subject,
          message,
          gymName,
        }),
      })
      if (sendErr) { failed++; console.error('Failed to send to', member.email, sendErr) }
      else sent++
    }

    return Response.json({ sent, failed, total: members.length })
  } catch (err) {
    console.error('Notification error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}