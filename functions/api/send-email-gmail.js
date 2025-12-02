/**
 * Cloudflare Pages Function to send emails via Gmail API
 * Requires Gmail API OAuth2 setup
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

export async function onRequestPost(context) {
  const { request, env } = context
  const { to, subject, body, html } = await request.json()

  try {
    // Gmail API requires OAuth2 access token
    const GMAIL_ACCESS_TOKEN = env.VITE_GMAIL_ACCESS_TOKEN
    
    if (!GMAIL_ACCESS_TOKEN) {
      throw new Error('VITE_GMAIL_ACCESS_TOKEN not configured. You need to set up Gmail API OAuth2.')
    }

    const FROM_EMAIL = env.VITE_FROM_EMAIL
    
    if (!FROM_EMAIL) {
      throw new Error('VITE_FROM_EMAIL not configured. Set VITE_FROM_EMAIL in Pages environment variables.')
    }

    // Gmail API send email endpoint
    const emailContent = [
      `From: ${FROM_EMAIL}`,
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      html || body.replace(/\n/g, '<br>')
    ].join('\n')

    // Base64 encode the email
    const encodedEmail = btoa(emailContent)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GMAIL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to send email via Gmail API')
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
    console.error('Gmail API error:', error)
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

