/**
 * Simple test endpoint to verify Pages Functions are working
 */
export async function onRequest() {
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Pages Functions are working!',
      timestamp: new Date().toISOString()
    }),
    {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}

