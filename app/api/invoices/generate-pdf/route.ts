/**
 * Generate PDF Invoice API Route
 * Generates PDF invoice and returns it as download
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth'
import { getDatabase } from '@/lib/server/db'
import { getClient, getSetting } from '@/lib/server/db-operations'
import { getUserInfo, generateInvoicePDF } from '@/lib/server/pdf-generator'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const {
      clientId,
      periodStart,
      periodEnd,
      numberOfDays,
      description,
      expenses,
      orderNumber,
      invoiceNumber,
      invoiceDate,
      vatPercentage: formVatPercentage,
    } = body

    if (!clientId || !periodStart || !periodEnd || !numberOfDays || !orderNumber || !invoiceNumber || !invoiceDate) {
      return NextResponse.json(
        { error: true, message: 'Missing required fields: clientId, periodStart, periodEnd, numberOfDays, orderNumber, invoiceNumber, invoiceDate' },
        { status: 400 }
      )
    }

    // Validate user information exists
    const userInfo = await getUserInfo(userId)
    if (!userInfo) {
      return NextResponse.json(
        { error: true, message: 'User information not configured. Please configure your company information in settings.' },
        { status: 400 }
      )
    }

    // Get client and validate daily_rate
    const client = await getClient(clientId, userId)
    if (!client) {
      return NextResponse.json(
        { error: true, message: 'Client not found' },
        { status: 404 }
      )
    }

    if (!client.daily_rate || client.daily_rate <= 0) {
      return NextResponse.json(
        { error: true, message: 'Client daily rate not configured' },
        { status: 400 }
      )
    }

    // Calculate values
    const netServiceCharge = numberOfDays * client.daily_rate
    const expensesTotal = (expenses || []).reduce((sum: number, exp: { amount: number }) => sum + (exp.amount || 0), 0)
    const netInvoice = netServiceCharge + expensesTotal
    
    // Get VAT percentage from form or user settings (form takes precedence)
    let vatPercentage = 0
    if (formVatPercentage !== undefined && formVatPercentage !== null) {
      vatPercentage = Number(formVatPercentage)
    } else {
      const vatPercentageStr = await getSetting('user_vat_percentage', userId)
      vatPercentage = vatPercentageStr ? parseFloat(vatPercentageStr) : 0
    }
    const grossInvoice = netInvoice * (1 + (vatPercentage / 100))

    // Use provided values from form (orderNumber, invoiceNumber, invoiceDate)
    // Get client address, VAT, and currency
    const clientAddress = client.address || ''
    const clientVat = client.vat || ''
    const clientCurrency = client.currency || 'EUR'

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(
      {
        clientId,
        clientName: client.name,
        clientAddress,
        clientVat,
        periodStart,
        periodEnd,
        numberOfDays,
        dailyRate: client.daily_rate,
        description,
        poNumber: client.po_number,
        expenses: expenses || [],
        netServiceCharge,
        netInvoice,
        grossInvoice,
        invoiceNumber: String(invoiceNumber),
        invoiceDate,
        orderNumber,
        currency: clientCurrency,
      },
      userInfo,
      userId
    )

    // Create invoice record in database (without file initially)
    const db = await getDatabase()
    const invoiceId = `invoice-${Date.now()}`
    const month = new Date(periodStart).getMonth() + 1
    const invoiceYear = new Date(periodStart).getFullYear()

    await db.collection('invoices').insertOne({
      id: invoiceId,
      user_id: userId,
      client_id: clientId,
      invoice_amount: grossInvoice,
      due_date: null,
      month,
      year: invoiceYear,
      period_start: periodStart,
      period_end: periodEnd,
      number_of_days: numberOfDays,
      description: description || null,
      expenses: expenses || [],
      invoice_number: String(invoiceNumber),
      uploaded_at: new Date(),
      sent_to_client: false,
      sent_to_client_at: null,
      payment_received: false,
      payment_received_at: null,
      sent_to_accountant: false,
      sent_to_accountant_at: null,
    })

    // Invoice number already saved above

    // Return PDF as download - format: "year.month.pdf" (e.g., "2024.01.pdf")
    // Reuse month and invoiceYear already calculated above
    const fileName = `${invoiceYear}.${String(month).padStart(2, '0')}.pdf`
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error generating PDF:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}
