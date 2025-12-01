/**
 * Cloudflare Pages Function to proxy D1 database requests
 * This file should be deployed to Cloudflare Pages Functions
 * 
 * For local testing with Wrangler, this also works as a Worker
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
      message: 'This endpoint only accepts POST requests. Please use POST method to query the D1 database.' 
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
  const { sql, params = [] } = await request.json()

  try {
    // Check if DB binding exists (Pages Functions)
    if (!env.DB) {
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: 'D1 database binding not found. Make sure DB is bound in Pages settings.' 
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

    // Execute query on D1
    const result = await env.DB.prepare(sql).bind(...params).all()

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('D1 query error:', error)
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error.message 
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

// Also export as default for Wrangler Worker compatibility
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { sql, params = [] } = await request.json()

    try {
      if (!env.DB) {
        return new Response(
          JSON.stringify({ 
            error: true, 
            message: 'D1 database binding not found' 
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      const result = await env.DB.prepare(sql).bind(...params).all()
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: error.message 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  },
}

