import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const TEMPLATES = {
  gymNotification: ({ memberName, subject, message, gymName }) => ({
    subject,
    html: '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">'
      + '<div style="font-size: 11px; font-weight: 700; color: #8E8E93; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px;">' + gymName + '</div>'
      + '<h1 style="font-size: 22px; font-weight: 700; color: #1C1C1E; margin: 0 0 8px;">' + subject + '</h1>'
      + '<p style="font-size: 15px; color: #8E8E93; margin: 0 0 24px;">Hey ' + memberName + ',</p>'
      + '<div style="background: #F2F2F7; border-radius: 16px; padding: 20px; margin-bottom: 24px;">'
      + '<p style="font-size: 15px; color: #1C1C1E; margin: 0; line-height: 1.6;">' + message.replace(/\n/g, '<br>') + '</p>'
      + '</div>'
      + '<p style="font-size: 13px; color: #AEAEB2;">— The ' + gymName + ' team</p>'
      + '</div>',
  }),

  bookingConfirmed: ({ memberName, className, trainer, day, time, gymName }) => ({
    subject: 'Booking Confirmed — ' + className,
    html: '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">'
      + '<div style="font-size: 11px; font-weight: 700; color: #8E8E93; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px;">'
      + gymName
      + '</div>'
      + '<h1 style="font-size: 22px; font-weight: 700; color: #1C1C1E; margin: 0 0 8px;">Booking Confirmed ✅</h1>'
      + '<p style="font-size: 15px; color: #8E8E93; margin: 0 0 24px;">Hey ' + memberName + ', your class is confirmed.</p>'
      + '<div style="background: #F2F2F7; border-radius: 16px; padding: 20px; margin-bottom: 24px;">'
      + '<div style="font-size: 17px; font-weight: 700; color: #1C1C1E; margin-bottom: 4px;">' + className + '</div>'
      + '<div style="font-size: 14px; color: #8E8E93; margin-bottom: 2px;">' + day + ' at ' + time + '</div>'
      + (trainer ? '<div style="font-size: 14px; color: #8E8E93;">with ' + trainer + '</div>' : '')
      + '</div>'
      + '<p style="font-size: 13px; color: #AEAEB2;">See you there! If you need to cancel, head to your Bookings page.</p>'
      + '</div>',
  }),

  bookingCancelled: ({ memberName, className, day, time, gymName }) => ({
    subject: 'Booking Cancelled — ' + className,
    html: '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">'
      + '<div style="font-size: 11px; font-weight: 700; color: #8E8E93; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px;">'
      + gymName
      + '</div>'
      + '<h1 style="font-size: 22px; font-weight: 700; color: #1C1C1E; margin: 0 0 8px;">Booking Cancelled</h1>'
      + '<p style="font-size: 15px; color: #8E8E93; margin: 0 0 24px;">Hey ' + memberName + ', your booking has been cancelled.</p>'
      + '<div style="background: #F2F2F7; border-radius: 16px; padding: 20px; margin-bottom: 24px;">'
      + '<div style="font-size: 17px; font-weight: 700; color: #1C1C1E; margin-bottom: 4px;">' + className + '</div>'
      + '<div style="font-size: 14px; color: #8E8E93;">' + day + ' at ' + time + '</div>'
      + '</div>'
      + '<p style="font-size: 13px; color: #AEAEB2;">You can always book another class from the Schedule page.</p>'
      + '</div>',
  }),

  waitlistSpotAvailable: ({ memberName, className, trainer, day, time, gymName }) => ({
    subject: 'A spot opened up — ' + className,
    html: '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">'
      + '<div style="font-size: 11px; font-weight: 700; color: #8E8E93; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 20px;">'
      + gymName
      + '</div>'
      + '<h1 style="font-size: 22px; font-weight: 700; color: #1C1C1E; margin: 0 0 8px;">A spot just opened up! 🎉</h1>'
      + '<p style="font-size: 15px; color: #8E8E93; margin: 0 0 24px;">Hey ' + memberName + ', a spot opened up in a class you were waitlisted for.</p>'
      + '<div style="background: #F2F2F7; border-radius: 16px; padding: 20px; margin-bottom: 24px;">'
      + '<div style="font-size: 17px; font-weight: 700; color: #1C1C1E; margin-bottom: 4px;">' + className + '</div>'
      + '<div style="font-size: 14px; color: #8E8E93; margin-bottom: 2px;">' + day + ' at ' + time + '</div>'
      + (trainer ? '<div style="font-size: 14px; color: #8E8E93;">with ' + trainer + '</div>' : '')
      + '</div>'
      + '<p style="font-size: 13px; color: #AEAEB2;">Head to the app to book your spot before someone else does!</p>'
      + '</div>',
  }),
}

export async function POST(req) {
  try {
    const { type, to, data } = await req.json()

    const template = TEMPLATES[type]
    if (!template) {
      return Response.json({ error: 'Unknown email type' }, { status: 400 })
    }

    const { subject, html } = template(data)

    const { error } = await resend.emails.send({
      from: data.gymName + ' <onboarding@resend.dev>',
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Email error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}