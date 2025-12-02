/**
 * Cloudflare Pages Function to send emails via EmailJS (supports Gmail)
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
    // EmailJS configuration
    const EMAILJS_SERVICE_ID = env.VITE_EMAILJS_SERVICE_ID
    const EMAILJS_TEMPLATE_ID = env.VITE_EMAILJS_TEMPLATE_ID
    const EMAILJS_USER_ID = env.VITE_EMAILJS_USER_ID
    
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_USER_ID) {
      throw new Error('EmailJS not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_USER_ID in Pages environment variables.')
    }

    const FROM_EMAIL = env.VITE_FROM_EMAIL
    
    if (!FROM_EMAIL) {
      throw new Error('VITE_FROM_EMAIL not configured. Set VITE_FROM_EMAIL in Pages environment variables.')
    }

    // EmailJS API
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_USER_ID,
        template_params: {
          from_email: FROM_EMAIL,
          to_email: Array.isArray(to) ? to[0] : to,
          to_email_list: Array.isArray(to) ? to : [to],
          subject: subject,
          message: html || body.replace(/\n/g, '<br>'),
          message_html: html || body.replace(/\n/g, '<br>'),
          message_text: body,
        }
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.text || 'Failed to send email via EmailJS')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data.text || 'sent'
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Email send error:', error)
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

