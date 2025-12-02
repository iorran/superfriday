/**
 * Cloudflare Pages Function to send emails via SMTP (Gmail)
 * Uses worker-mailer library for SMTP support
 */

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

// Handle GET requests with helpful error
export async function onRequestGet() {
  return new Response(
    JSON.stringify({ 
      error: true, 
      message: 'This endpoint only accepts POST requests. Use POST method to send emails.' 
    }),
    {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Allow': 'POST, OPTIONS',
      },
    }
  )
}

export async function onRequestPost(context) {
  const { request, env } = context
  const { to, subject, body, html } = await request.json()

  try {
    // Gmail SMTP configuration
    const GMAIL_USER = env.VITE_GMAIL_USER
    const GMAIL_APP_PASSWORD = env.VITE_GMAIL_APP_PASSWORD
    const FROM_EMAIL = env.VITE_FROM_EMAIL || GMAIL_USER
    
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('Gmail SMTP not configured. Set VITE_GMAIL_USER and VITE_GMAIL_APP_PASSWORD in Pages environment variables.')
    }

    // Import worker-mailer
    const { WorkerMailer } = await import('worker-mailer')

    // Connect to Gmail SMTP
    const mailer = await WorkerMailer.connect({
      credentials: {
        username: GMAIL_USER,
        password: GMAIL_APP_PASSWORD,
      },
      authType: 'plain',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS on port 587
    })

    // Send email
    await mailer.send({
      from: { email: FROM_EMAIL },
      to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
      subject: subject,
      text: body,
      html: html || body.replace(/\n/g, '<br>'),
    })

    // Close connection
    await mailer.close()

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: 'sent'
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('SMTP send error:', error)
    console.error('Request data:', { to, subject })
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}

