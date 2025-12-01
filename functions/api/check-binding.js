/**
 * Diagnostic endpoint to check if D1 binding is working
 */
export async function onRequest(context) {
  const { env } = context
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    bindingExists: !!env.DB,
    bindingType: typeof env.DB,
    bindingKeys: env.DB ? Object.keys(env.DB) : [],
    allEnvKeys: Object.keys(env).filter(key => !key.startsWith('_')),
  }

  // Try to execute a simple query if binding exists
  if (env.DB) {
    try {
      const testResult = await env.DB.prepare('SELECT 1 as test').first()
      diagnostics.queryTest = {
        success: true,
        result: testResult
      }
    } catch (error) {
      diagnostics.queryTest = {
        success: false,
        error: error.message
      }
    }
  }

  return new Response(
    JSON.stringify(diagnostics, null, 2),
    {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}

