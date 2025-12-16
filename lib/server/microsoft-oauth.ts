/**
 * Microsoft OAuth Service
 * Handles OAuth flow for Microsoft/Outlook email accounts
 */

import { getEmailAccount, updateEmailAccount } from './db-operations'

const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI

if (!REDIRECT_URI) {
  console.warn('Microsoft OAuth redirect URI not configured. Microsoft OAuth features will be disabled.')
}

// Microsoft OAuth endpoints
const AUTHORIZATION_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

// OAuth scopes for SMTP
const SCOPES = [
  'https://outlook.office365.com/SMTP.Send',
  'offline_access',
]

/**
 * Generate OAuth authorization URL
 */
export const getAuthUrl = (
  accountId: string,
  userId: string,
  clientId: string
): string => {
  const redirectUri = REDIRECT_URI

  if (!clientId || !redirectUri) {
    throw new Error('Microsoft OAuth credentials not configured. Please provide Client ID in email account settings and set MICROSOFT_REDIRECT_URI environment variable.')
  }

  // Encode state as JSON with accountId and userId for security
  const state = encodeURIComponent(JSON.stringify({ accountId, userId }))

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: SCOPES.join(' '),
    state: state,
    prompt: 'consent', // Force consent to get refresh token
  })

  return `${AUTHORIZATION_ENDPOINT}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
const exchangeCodeForTokens = async (
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: SCOPES.join(' '),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Token exchange error:', errorText)
    throw new Error(`Failed to exchange code for tokens: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.access_token) {
    throw new Error('No access token received from Microsoft')
  }

  if (!data.refresh_token) {
    throw new Error('No refresh token received from Microsoft. Please ensure prompt=consent is set.')
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 3600,
    token_type: data.token_type || 'Bearer',
  }
}

/**
 * Handle OAuth callback and exchange code for tokens
 */
export const handleOAuthCallback = async (
  code: string,
  accountId: string,
  userId: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  // Get email account to retrieve Client ID/Secret
  const account = await getEmailAccount(accountId, userId)
  if (!account) {
    throw new Error(`Email account ${accountId} not found`)
  }

  // Require account's Client ID/Secret - each user must provide their own
  const clientId = account.oauth2_client_id
  const clientSecret = account.oauth2_client_secret
  const redirectUri = REDIRECT_URI

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured. Please provide Client ID and Client Secret in email account settings before connecting.')
  }

  if (!redirectUri) {
    throw new Error('MICROSOFT_REDIRECT_URI environment variable is not configured.')
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri)

  // Update email account with OAuth tokens
  await updateEmailAccount(
    accountId,
    {
      oauth2_client_id: clientId,
      oauth2_client_secret: clientSecret,
      oauth2_access_token: tokens.access_token,
      oauth2_refresh_token: tokens.refresh_token,
    },
    userId
  )

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  }
}

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (
  accountId: string,
  userId: string
): Promise<string> => {
  // Get email account to retrieve tokens and credentials
  const account = await getEmailAccount(accountId, userId)
  if (!account) {
    throw new Error(`Email account ${accountId} not found`)
  }

  if (!account.oauth2_refresh_token) {
    throw new Error('No refresh token found. Please reconnect your Microsoft account.')
  }

  const clientId = account.oauth2_client_id
  const clientSecret = account.oauth2_client_secret

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured. Please provide Client ID and Client Secret in email account settings.')
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.oauth2_refresh_token,
      grant_type: 'refresh_token',
      scope: SCOPES.join(' '),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Token refresh error:', errorText)
    throw new Error(`Failed to refresh access token: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.access_token) {
    throw new Error('Failed to refresh access token')
  }

  // Update stored access token (refresh token may also be updated)
  await updateEmailAccount(
    accountId,
    {
      oauth2_access_token: data.access_token,
      ...(data.refresh_token ? { oauth2_refresh_token: data.refresh_token } : {}),
    },
    userId
  )

  return data.access_token
}
