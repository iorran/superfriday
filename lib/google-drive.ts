/**
 * Google Drive API Service
 * Handles OAuth flow and Google Drive API operations
 */

import { google } from 'googleapis'
import { getGoogleOAuthToken, saveGoogleOAuthToken } from './db-client'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.warn('Google Drive OAuth credentials not configured. Google Drive features will be disabled.')
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error('Google OAuth credentials not configured')
  }
  
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client()
  
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly', // Read-only access to Drive
  ]
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state: state || undefined,
  })
}

/**
 * Handle OAuth callback and exchange code for tokens
 */
export async function handleOAuthCallback(
  code: string,
  userId: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const oauth2Client = createOAuth2Client()
  
  const { tokens } = await oauth2Client.getToken(code)
  
  if (!tokens.access_token) {
    throw new Error('Failed to get access token')
  }
  
  if (!tokens.refresh_token) {
    throw new Error('Failed to get refresh token')
  }
  
  const expiresIn = tokens.expiry_date 
    ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
    : 3600 // Default to 1 hour if not provided
  
  // Store tokens in database (encrypted)
  await saveGoogleOAuthToken(
    userId,
    tokens.access_token,
    tokens.refresh_token,
    expiresIn
  )
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  }
}

/**
 * Get or refresh access token for a user
 */
export async function getAccessToken(userId: string): Promise<string> {
  const tokenData = await getGoogleOAuthToken(userId)
  
  if (!tokenData) {
    throw new Error('No Google OAuth token found. Please reconnect Google Drive.')
  }
  
  // Check if token is expired
  const now = new Date()
  const expiresAt = new Date(tokenData.expires_at)
  
  if (expiresAt > now) {
    // Token is still valid
    return tokenData.access_token
  }
  
  // Token expired, refresh it
  return await refreshAccessToken(userId, tokenData.refresh_token)
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })
  
  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token')
    }
    
    const expiresIn = credentials.expiry_date
      ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
      : 3600
    
    // Update stored tokens (use new refresh token if provided, otherwise keep existing)
    await saveGoogleOAuthToken(
      userId,
      credentials.access_token,
      credentials.refresh_token || refreshToken,
      expiresIn
    )
    
    return credentials.access_token
  } catch (error) {
    console.error('Error refreshing access token:', error)
    throw new Error('Failed to refresh access token. Please reconnect Google Drive.')
  }
}

/**
 * Get authenticated Drive API client
 */
export async function getDriveClient(userId: string) {
  const accessToken = await getAccessToken(userId)
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: accessToken,
  })
  
  return google.drive({ version: 'v3', auth: oauth2Client })
}

/**
 * List folders in user's Google Drive
 */
export async function listFolders(userId: string) {
  const drive = await getDriveClient(userId)
  
  const response = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name, parents)',
    orderBy: 'name',
    pageSize: 100,
  })
  
  return response.data.files || []
}

/**
 * List PDF files in a specific folder
 */
export async function listFilesInFolder(userId: string, folderId: string) {
  const drive = await getDriveClient(userId)
  
  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
    fields: 'files(id, name, size, modifiedTime)',
    orderBy: 'name',
    pageSize: 1000,
  })
  
  return response.data.files || []
}

/**
 * Search for PDF files in user's Google Drive
 */
export async function searchFiles(userId: string, query?: string) {
  const drive = await getDriveClient(userId)
  
  let searchQuery = "mimeType='application/pdf' and trashed=false"
  if (query) {
    searchQuery += ` and name contains '${query.replace(/'/g, "\\'")}'`
  }
  
  const response = await drive.files.list({
    q: searchQuery,
    fields: 'files(id, name, size, modifiedTime, parents)',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
  })
  
  return response.data.files || []
}

/**
 * Download a file from Google Drive
 */
export async function downloadFile(userId: string, fileId: string): Promise<Buffer> {
  const drive = await getDriveClient(userId)
  
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  )
  
  return Buffer.from(response.data as ArrayBuffer)
}

/**
 * Get file metadata
 */
export async function getFileMetadata(userId: string, fileId: string) {
  const drive = await getDriveClient(userId)
  
  const response = await drive.files.get({
    fileId,
    fields: 'id, name, size, mimeType, modifiedTime, parents',
  })
  
  return response.data
}

