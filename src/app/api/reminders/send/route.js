import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Get bookings where reminder is enabled, not yet sent, and class is in ~24hrs
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      reminder_enabled,
      reminder_sent,
      profiles:member_id (email, full_name),
      classes:class_id (type, day, time, gyms:gym_id (name))
    `)
    .eq('status', 'booked')
    .eq('reminder_enabled', true)
    .eq('reminder_sent', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0, skipped = 0, failed = 0;

  for (const booking of bookings ?? []) {
    try {
      await resend.emails.send({
        from: 'Humanitix Wellness <onboarding@resend.dev>',
        to: booking.profiles.email,
        subject: `Reminder: ${booking.classes.type} tomorrow`,
        html: `<p>Hi ${booking.profiles.full_name},</p>
               <p>Just a reminder that you have <strong>${booking.classes.type}</strong> tomorrow at <strong>${booking.classes.time}</strong> at ${booking.classes.gyms.name}.</p>
               <p>See you there!</p>`
      });

      await supabase.from('bookings').update({ reminder_sent: true }).eq('id', booking.id);
      sent++;
    } catch (e) {
      failed++;
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
