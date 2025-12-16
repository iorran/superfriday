/**
 * Email Templates API Route
 * Handles email template CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getEmailTemplates,
  getEmailTemplate,
  getEmailTemplateByClient,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from '@/lib/server/db-operations'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')
    const clientId = searchParams.get('clientId')

    if (templateId) {
      const template = await getEmailTemplate(templateId, userId)
      if (!template) {
        return NextResponse.json(
          { error: true, message: 'Template not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(template)
    }

    if (clientId) {
      const template = await getEmailTemplateByClient(clientId, userId)
      if (!template) {
        return NextResponse.json(
          { error: true, message: 'Template not found for this client' },
          { status: 404 }
        )
      }
      return NextResponse.json(template)
    }

    const templates = await getEmailTemplates(userId)
    return NextResponse.json(templates)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching email templates:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email templates'
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
    const id = await createEmailTemplate(body, userId)
    return NextResponse.json({ id })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating email template:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create email template'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: true, message: 'Template ID is required' },
        { status: 400 }
      )
    }

    await updateEmailTemplate(id, updates, userId)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error updating email template:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update email template'
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
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json(
        { error: true, message: 'Template ID is required' },
        { status: 400 }
      )
    }

    await deleteEmailTemplate(templateId, userId)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting email template:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete email template'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

