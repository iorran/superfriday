/**
 * Email Templates API Route
 * Handles email template CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from '@/lib/db-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (templateId) {
      const template = await getEmailTemplate(templateId)
      if (!template) {
        return NextResponse.json(
          { error: true, message: 'Template not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(template)
    }

    const templates = await getEmailTemplates()
    return NextResponse.json(templates)
  } catch (error: unknown) {
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
    const body = await request.json()
    const id = await createEmailTemplate(body)
    return NextResponse.json({ id })
  } catch (error: unknown) {
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
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: true, message: 'Template ID is required' },
        { status: 400 }
      )
    }

    await updateEmailTemplate(id, updates)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
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
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json(
        { error: true, message: 'Template ID is required' },
        { status: 400 }
      )
    }

    await deleteEmailTemplate(templateId)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting email template:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete email template'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

