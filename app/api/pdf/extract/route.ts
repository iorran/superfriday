/**
 * PDF Extraction API Route
 * Extracts data from PDF files using Veryfi API
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import type { ExtractedPDFData } from '@/types'

/**
 * Veryfi API response structure (partial, only fields we use)
 */
interface VeryfiResponse {
  total?: number | string
  subtotal?: number | string
  due_date?: string
  date?: string
  invoice_date?: string
  ocr_text?: string
  vendor?: {
    name?: string
  }
  bill_to_name?: string // Client name (who receives the invoice)
  bill_to_address?: string
  line_items?: Array<{
    description?: string
  }>
}

/**
 * Map Veryfi API response to ExtractedPDFData format
 */
function mapVeryfiResponse(veryfiData: VeryfiResponse): ExtractedPDFData {
  // Extract amount from total or subtotal
  let amount: number | null = null
  if (veryfiData.total) {
    amount = parseFloat(String(veryfiData.total))
  } else if (veryfiData.subtotal) {
    amount = parseFloat(String(veryfiData.subtotal))
  }

  // Extract due date
  let dueDate: string | null = null
  if (veryfiData.due_date) {
    // Veryfi returns date in various formats, try to normalize
    const dateStr = String(veryfiData.due_date)
    // Try to parse and format as YYYY-MM-DD
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      dueDate = date.toISOString().split('T')[0]
    } else {
      // Try manual parsing for common formats
      const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (dateMatch) {
        dueDate = dateStr
      }
    }
  }

  // Extract month and year from invoice date or due date
  let month: number | null = null
  let year: number | null = null
  
  const dateToUse = dueDate || veryfiData.date || veryfiData.invoice_date
  if (dateToUse) {
    const date = new Date(dateToUse)
    if (!isNaN(date.getTime())) {
      month = date.getMonth() + 1
      year = date.getFullYear()
    }
  }

  // Extract client name from "bill_to" (who receives the invoice)
  // This is the client, not the vendor
  const clientName: string | null = veryfiData.bill_to_name?.trim() || null

  // Extract raw text (combine various text fields)
  const rawTextParts: string[] = []
  if (veryfiData.ocr_text) rawTextParts.push(veryfiData.ocr_text)
  if (veryfiData.bill_to_name) rawTextParts.push(`Bill To: ${veryfiData.bill_to_name}`)
  if (veryfiData.bill_to_address) rawTextParts.push(`Address: ${veryfiData.bill_to_address}`)
  if (veryfiData.vendor?.name) rawTextParts.push(`Vendor: ${veryfiData.vendor.name}`)
  if (veryfiData.line_items) {
    veryfiData.line_items.forEach((item) => {
      if (item.description) rawTextParts.push(item.description)
    })
  }
  const rawText = rawTextParts.join('\n').substring(0, 1000)

  // Determine confidence based on extracted fields
  let confidence: 'high' | 'medium' | 'low' = 'low'
  let score = 0
  if (amount) score += 2
  if (dueDate) score += 2
  if (month && year) score += 1
  if (clientName) score += 1

  if (score >= 4) confidence = 'high'
  else if (score >= 2) confidence = 'medium'

  return {
    amount,
    dueDate,
    month,
    year,
    clientName,
    rawText,
    confidence,
  }
}

export async function POST(request: NextRequest) {
  console.log('PDF extract route called')
  try {
    // Require authentication
    await requireAuth()

    // Check for Veryfi API credentials
    const clientId = process.env.VERYFI_CLIENT_ID
    const username = process.env.VERYFI_USERNAME
    const apiKey = process.env.VERYFI_API_KEY
    
    console.log('Veryfi credentials check:', {
      hasClientId: !!clientId,
      hasUsername: !!username,
      hasApiKey: !!apiKey,
    })

    if (!clientId || !username || !apiKey) {
      return NextResponse.json(
        {
          error: true,
          message: 'Veryfi API credentials not configured. Please set VERYFI_CLIENT_ID, VERYFI_USERNAME, and VERYFI_API_KEY environment variables.',
        },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: true, message: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: true, message: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: true, message: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Convert file to buffer for Veryfi API
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Prepare form data for Veryfi API
    // Veryfi expects multipart/form-data with just the file (no extra fields)
    const veryfiFormData = new FormData()
    
    // Add the file
    const fileBlob = new File([buffer], file.name, { type: 'application/pdf' })
    veryfiFormData.append('file', fileBlob)

    // Call Veryfi API
    let veryfiResponse: Response
    try {
      veryfiResponse = await fetch('https://api.veryfi.com/api/v8/partner/documents', {
        method: 'POST',
        headers: {
          'CLIENT-ID': clientId,
          'AUTHORIZATION': `apikey ${username}:${apiKey}`,
          'Accept': 'application/json',
          // Don't set Content-Type header - let fetch set it with boundary for FormData
        },
        body: veryfiFormData,
      })
    } catch (fetchError) {
      console.error('Failed to call Veryfi API:', fetchError)
      return NextResponse.json(
        {
          error: true,
          message: `Failed to connect to Veryfi API: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        },
        { status: 500 }
      )
    }

    if (!veryfiResponse.ok) {
      let errorText = ''
      try {
        errorText = await veryfiResponse.text()
      } catch (textError) {
        console.error('Failed to read error response:', textError)
      }
      
      console.error('Veryfi API error:', {
        status: veryfiResponse.status,
        statusText: veryfiResponse.statusText,
        errorText,
        headers: Object.fromEntries(veryfiResponse.headers.entries()),
      })
      
      // Try to parse error JSON
      let errorMessage = `Veryfi API error (${veryfiResponse.status}): ${veryfiResponse.statusText}`
      if (errorText) {
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorJson.error || errorJson.detail || errorMessage
        } catch {
          // If not JSON, use the text (limit length)
          errorMessage = errorText.length > 200 ? `${errorText.substring(0, 200)}...` : errorText
        }
      }

      return NextResponse.json(
        {
          error: true,
          message: errorMessage,
        },
        { status: veryfiResponse.status }
      )
    }

    let veryfiData: VeryfiResponse
    try {
      veryfiData = await veryfiResponse.json()
    } catch (jsonError) {
      console.error('Failed to parse Veryfi API response:', jsonError)
      return NextResponse.json(
        {
          error: true,
          message: 'Invalid response from Veryfi API',
        },
        { status: 500 }
      )
    }

    // Map Veryfi response to our format
    const extractedData = mapVeryfiResponse(veryfiData)

    // If no useful data extracted, return with warning
    if (!extractedData.amount && !extractedData.dueDate) {
      return NextResponse.json({
        success: true,
        data: extractedData,
        warning: 'Limited data extracted from PDF. You can still upload the file and fill the form manually.',
      })
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('PDF extraction error:', error)
    const errorMessage = error instanceof Error 
      ? `${error.message}${error.stack ? `\nStack: ${error.stack.substring(0, 500)}` : ''}` 
      : 'Failed to extract PDF data'
    
    // Don't expose stack trace to client in production
    const clientMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to extract PDF data. Please check server logs for details.'
      : errorMessage
    
    return NextResponse.json(
      { error: true, message: clientMessage },
      { status: 500 }
    )
  }
}
