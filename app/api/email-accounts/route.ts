/**
 * Email Accounts API Route
 * Handles email account CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getEmailAccounts,
  getEmailAccount,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
} from '@/lib/server/db-operations'
import { requireAuth } from '@/lib/server/auth'
import { clearTransporterCache } from '@/lib/server/email'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')

    if (accountId) {
      const account = await getEmailAccount(accountId, userId)
      if (!account) {
        return NextResponse.json(
          { error: true, message: 'Email account not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(account)
    }

    const accounts = await getEmailAccounts(userId)
    return NextResponse.json(accounts)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching email accounts:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email accounts'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { 
      name, 
      email, 
      smtp_host, 
      smtp_port, 
      smtp_user, 
      smtp_pass, 
      oauth2_client_id,
      oauth2_client_secret,
      oauth2_refresh_token,
      oauth2_access_token,
      is_default 
    } = body

    // For OAuth2, we don't need smtp_pass, but for basic auth we do
    const useOAuth2 = oauth2_client_id && oauth2_client_secret && oauth2_refresh_token
    
    if (!name || !email || !smtp_host || !smtp_port || !smtp_user) {
      return NextResponse.json(
        { error: true, message: 'Name, email, SMTP host, port, and user are required' },
        { status: 400 }
      )
    }
    
    if (!useOAuth2 && !smtp_pass) {
      return NextResponse.json(
        { error: true, message: 'SMTP password is required when not using OAuth2' },
        { status: 400 }
      )
    }

    const id = await createEmailAccount(
      {
        name,
        email,
        smtp_host,
        smtp_port: parseInt(String(smtp_port)),
        smtp_user,
        smtp_pass: smtp_pass || '', // Required field but may be empty for OAuth2
        oauth2_client_id,
        oauth2_client_secret,
        oauth2_refresh_token,
        oauth2_access_token,
        is_default: is_default || false,
      },
      userId
    )

    return NextResponse.json({ id, success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating email account:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create email account'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { 
      id, 
      name, 
      email, 
      smtp_host, 
      smtp_port, 
      smtp_user, 
      smtp_pass, 
      oauth2_client_id,
      oauth2_client_secret,
      oauth2_refresh_token,
      oauth2_access_token,
      is_default 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: true, message: 'Account ID is required' },
        { status: 400 }
      )
    }

    const updateData: {
      name?: string
      email?: string
      smtp_host?: string
      smtp_port?: number
      smtp_user?: string
      smtp_pass?: string
      oauth2_client_id?: string
      oauth2_client_secret?: string
      oauth2_refresh_token?: string
      oauth2_access_token?: string
      is_default?: boolean
    } = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (smtp_host !== undefined) updateData.smtp_host = smtp_host
    if (smtp_port !== undefined) updateData.smtp_port = parseInt(String(smtp_port))
    if (smtp_user !== undefined) updateData.smtp_user = smtp_user
    if (smtp_pass !== undefined) updateData.smtp_pass = smtp_pass
    if (oauth2_client_id !== undefined) updateData.oauth2_client_id = oauth2_client_id
    if (oauth2_client_secret !== undefined) updateData.oauth2_client_secret = oauth2_client_secret
    if (oauth2_refresh_token !== undefined) updateData.oauth2_refresh_token = oauth2_refresh_token
    if (oauth2_access_token !== undefined) updateData.oauth2_access_token = oauth2_access_token
    if (is_default !== undefined) updateData.is_default = is_default

    await updateEmailAccount(id, updateData, userId)

    // Clear transporter cache when credentials are updated
    // This ensures the new credentials are used instead of cached ones
    if (updateData.smtp_pass !== undefined || updateData.smtp_user !== undefined || 
        updateData.smtp_host !== undefined || updateData.smtp_port !== undefined ||
        updateData.oauth2_client_id !== undefined || updateData.oauth2_client_secret !== undefined ||
        updateData.oauth2_refresh_token !== undefined) {
      clearTransporterCache(id)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error updating email account:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update email account'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')

    if (!accountId) {
      return NextResponse.json(
        { error: true, message: 'Account ID is required' },
        { status: 400 }
      )
    }

    await deleteEmailAccount(accountId, userId)

    // Clear transporter cache when account is deleted
    clearTransporterCache(accountId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting email account:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete email account'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

