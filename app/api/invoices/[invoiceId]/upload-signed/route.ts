/**
 * Upload Signed PDF API Route
 * Uploads a signed PDF file to blob storage and associates it with an invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import { getDatabase } from '@/lib/server/db'
import { uploadFile } from '@/lib/server/storage'
import { getClient } from '@/lib/server/db-operations'

/**
 * Sanitize a name for use in file paths
 */
const sanitizeForPath = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .substring(0, 50)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    const { invoiceId } = await params

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: true, message: 'File is required' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: true, message: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Verify invoice belongs to user
    const db = await getDatabase()
    const invoice = await db.collection('invoices').findOne({ id: invoiceId, user_id: userId })
    if (!invoice) {
      return NextResponse.json(
        { error: true, message: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Generate filename in year.month format
    const year = invoice.year || new Date().getFullYear()
    const month = invoice.month || new Date().getMonth() + 1
    const fileName = `${year}.${String(month).padStart(2, '0')}.pdf`

    // Get client name for path
    let clientNamePath = ''
    if (invoice.client_id) {
      const client = await getClient(invoice.client_id, userId)
      if (client && client.name) {
        const sanitizedClientName = sanitizeForPath(client.name)
        if (sanitizedClientName) {
          clientNamePath = `${sanitizedClientName}/`
        }
      }
    }

    // Upload file to blob
    const sanitizedEmail = session.user.email.replace(/[@.]/g, '_')
    const fileKey = `${sanitizedEmail}/${clientNamePath}invoices/${fileName}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    await uploadFile(fileKey, fileBuffer, 'application/pdf')

    // Create or update invoice file record
    const existingFile = await db.collection('invoice_files').findOne({
      invoice_id: invoiceId,
      file_type: 'invoice',
      user_id: userId,
    })

    if (existingFile) {
      // Update existing file record
      await db.collection('invoice_files').updateOne(
        { id: existingFile.id },
        {
          $set: {
            file_key: fileKey,
            original_name: fileName,
            file_size: file.size,
            uploaded_at: new Date(),
          },
        }
      )
    } else {
      // Create new file record
      await db.collection('invoice_files').insertOne({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        invoice_id: invoiceId,
        file_key: fileKey,
        file_type: 'invoice',
        original_name: fileName,
        file_size: file.size,
        uploaded_at: new Date(),
      })
    }

    return NextResponse.json({
      success: true,
      fileKey,
      message: 'Signed PDF uploaded successfully',
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error uploading signed PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload signed PDF'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}
