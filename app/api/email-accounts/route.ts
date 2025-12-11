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
} from '@/lib/db-client'
import { requireAuth } from '@/lib/auth-server'

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
    const { name, email, smtp_host, smtp_port, smtp_user, smtp_pass, is_default } = body

    if (!name || !email || !smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
      return NextResponse.json(
        { error: true, message: 'All fields are required' },
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
        smtp_pass,
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
    const { id, name, email, smtp_host, smtp_port, smtp_user, smtp_pass, is_default } = body

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
      is_default?: boolean
    } = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (smtp_host !== undefined) updateData.smtp_host = smtp_host
    if (smtp_port !== undefined) updateData.smtp_port = parseInt(String(smtp_port))
    if (smtp_user !== undefined) updateData.smtp_user = smtp_user
    if (smtp_pass !== undefined) updateData.smtp_pass = smtp_pass
    if (is_default !== undefined) updateData.is_default = is_default

    await updateEmailAccount(id, updateData, userId)

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

