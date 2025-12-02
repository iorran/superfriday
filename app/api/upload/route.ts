/**
 * File Upload API Route
 * Handles file uploads to Vercel Blob
 */

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { upsertInvoice } from '@/lib/db-client'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: true, message: 'BLOB_READ_WRITE_TOKEN not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const clientId = formData.get('clientId') as string
    const invoiceAmount = formData.get('invoiceAmount') as string
    const dueDate = formData.get('dueDate') as string

    if (!file || !clientId) {
      return NextResponse.json(
        { error: true, message: 'File and clientId are required' },
        { status: 400 }
      )
    }

    const fileKey = `${Date.now()}-${file.name}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload file to Vercel Blob
    const blob = await put(fileKey, fileBuffer, {
      access: 'public',
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    // Save invoice metadata to database
    await upsertInvoice({
      fileKey,
      clientId,
      originalName: file.name,
      fileSize: file.size,
      invoiceAmount: invoiceAmount ? parseFloat(invoiceAmount) : null,
      dueDate: dueDate || null,
    })

    return NextResponse.json({
      success: true,
      fileKey,
      fileName: file.name,
      url: blob.url,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: true, message: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
