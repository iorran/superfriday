/**
 * Cloudflare Pages Function to send emails
 * Uses Resend API (recommended) or SendGrid
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
      message: 'This endpoint only accepts POST requests. Please use POST method to send emails.' 
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
    // Get Resend API key from environment variables
    const RESEND_API_KEY = env.VITE_RESEND_API_KEY
    
    if (!RESEND_API_KEY) {
      throw new Error('VITE_RESEND_API_KEY not configured. Set VITE_RESEND_API_KEY in Pages environment variables.')
    }

    const FROM_EMAIL = env.VITE_FROM_EMAIL
    
    if (!FROM_EMAIL) {
      throw new Error('VITE_FROM_EMAIL not configured. Set VITE_FROM_EMAIL in Pages environment variables.')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || body.replace(/\n/g, '<br>'),
        text: body,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        id: data.id 
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

