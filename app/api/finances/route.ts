/**
 * Finances API Route
 * Provides aggregated financial data for charts and analytics
 */

import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth'
import { getSetting } from '@/lib/server/db-operations'

export async function GET() {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const db = await getDatabase()

    // Get all invoices with client info for this user
    const invoices = await db.collection('invoices').aggregate([
      {
        $match: { user_id: userId }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'client_id',
          foreignField: 'id',
          as: 'client'
        }
      },
      {
        $unwind: {
          path: '$client',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          id: 1,
          client_id: 1,
          client_name: { $ifNull: ['$client.name', 'Unknown'] },
          client_currency: { $ifNull: ['$client.currency', 'EUR'] },
          invoice_amount: 1,
          invoice_amount_eur: 1,
          year: 1,
          month: 1,
          sent_to_client: 1,
          sent_to_accountant: 1,
          uploaded_at: 1,
        }
      }
    ]).toArray()

    // Get GBP to EUR conversion rate
    const gbpToEurRateStr = await getSetting('gbp_to_eur_rate', userId)
    const gbpToEurRate = gbpToEurRateStr ? parseFloat(gbpToEurRateStr) : 1.15

    // Type for invoice in aggregation result
    type InvoiceAggregation = {
      invoice_amount_eur?: number | null
      client_currency?: string
      invoice_amount?: number
    }

    // Helper function to get amount in EUR
    const getAmountInEur = (invoice: InvoiceAggregation) => {
      // If invoice_amount_eur exists (already converted), use it
      if (invoice.invoice_amount_eur !== null && invoice.invoice_amount_eur !== undefined) {
        return invoice.invoice_amount_eur
      }
      // If client uses GBP, convert using rate
      if (invoice.client_currency === 'GBP' && invoice.invoice_amount) {
        return invoice.invoice_amount * gbpToEurRate
      }
      // Otherwise, return original amount (already in EUR)
      return invoice.invoice_amount || 0
    }

    // Calculate totals in EUR
    const totalIncome = invoices.reduce((sum, inv) => sum + getAmountInEur(inv), 0)
    
    // Amount sent to client but pending to accountant
    const pendingToAccountant = invoices
      .filter(inv => inv.sent_to_client && !inv.sent_to_accountant)
      .reduce((sum, inv) => sum + getAmountInEur(inv), 0)

    // Group by client
    const byClient = new Map<string, number>()
    invoices.forEach((inv) => {
      const clientName = inv.client_name || 'Unknown'
      const current = byClient.get(clientName) || 0
      byClient.set(clientName, current + getAmountInEur(inv))
    })
    const clientData = Array.from(byClient.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Group by month (YYYY-MM format)
    const byMonth = new Map<string, number>()
    invoices.forEach((inv) => {
      if (inv.year && inv.month) {
        const monthKey = `${inv.year}-${String(inv.month).padStart(2, '0')}`
        const current = byMonth.get(monthKey) || 0
        byMonth.set(monthKey, current + getAmountInEur(inv))
      }
    })
    const monthData = Array.from(byMonth.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Group by year
    const byYear = new Map<number, number>()
    invoices.forEach((inv) => {
      if (inv.year) {
        const current = byYear.get(inv.year) || 0
        byYear.set(inv.year, current + getAmountInEur(inv))
      }
    })
    const yearData = Array.from(byYear.entries())
      .map(([year, amount]) => ({ year, amount }))
      .sort((a, b) => a.year - b.year)

    // Status breakdown
    const sentToClient = invoices
      .filter(inv => inv.sent_to_client)
      .reduce((sum, inv) => sum + getAmountInEur(inv), 0)
    
    const sentToAccountant = invoices
      .filter(inv => inv.sent_to_accountant)
      .reduce((sum, inv) => sum + getAmountInEur(inv), 0)

    return NextResponse.json({
      totalIncome,
      pendingToAccountant,
      sentToClient,
      sentToAccountant,
      byClient: clientData,
      byMonth: monthData,
      byYear: yearData,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching finances:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch finances'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

