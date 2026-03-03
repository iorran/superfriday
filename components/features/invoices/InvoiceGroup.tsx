'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { FileText } from 'lucide-react'
import { InvoiceItem } from './InvoiceItem'
import { formatCurrency } from '@/lib/shared/utils'
import type { FormattedInvoice } from './InvoiceItem'
import type { Client } from '@/types'

interface InvoiceGroupProps {
  groupKey: string
  clientName: string
  invoices: FormattedInvoice[]
  isExpanded: boolean
  onToggle: () => void
  clients: Client[]
  deletingInvoice: string | null
  sendingEmail: string | null
  onSendEmail: (invoiceId: string, recipientType: 'client' | 'accountant') => void
  onStateChange: (invoiceId: string, updates: { sentToClient?: boolean; sentToAccountant?: boolean }) => void
  onDelete: (invoiceId: string, clientName: string) => void
  onEdit: (invoiceId: string) => void
  onEditClientEmail: (clientId: string, email: string) => void
  onShowToast: (title: string, description: string, variant: 'default' | 'destructive') => void
}

const getInvoicePriority = (inv: FormattedInvoice): number => {
  if (!inv.sentToClient) return 0
  if (!inv.sentToAccountant) return 1
  return 2
}

const InvoiceGroup = ({
  groupKey,
  clientName,
  invoices,
  isExpanded,
  onToggle,
  clients,
  deletingInvoice,
  sendingEmail,
  onSendEmail,
  onStateChange,
  onDelete,
  onEdit,
  onEditClientEmail,
  onShowToast,
}: InvoiceGroupProps) => {
  const groupClient = invoices.length > 0 && invoices[0].client_id
    ? clients.find((c) => c.id === invoices[0].client_id)
    : null
  const groupCurrency = groupClient?.currency || 'EUR'

  const totalAmount = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.invoice_amount || 0), 0),
    [invoices]
  )

  const pendingCount = useMemo(
    () => invoices.filter(inv => !inv.sentToClient || !inv.sentToAccountant).length,
    [invoices]
  )

  // Group invoices by year, sort years descending, sort invoices by priority then date
  const yearSections = useMemo(() => {
    const byYear: Record<number, FormattedInvoice[]> = {}
    for (const inv of invoices) {
      const year = inv.year || (inv.uploaded_at ? new Date(inv.uploaded_at).getFullYear() : 0)
      if (!byYear[year]) byYear[year] = []
      byYear[year].push(inv)
    }

    // Sort invoices within each year by priority, then by date descending
    for (const yearInvoices of Object.values(byYear)) {
      yearInvoices.sort((a, b) => {
        const priorityDiff = getInvoicePriority(a) - getInvoicePriority(b)
        if (priorityDiff !== 0) return priorityDiff

        const monthA = a.month || 0
        const monthB = b.month || 0
        if (monthB !== monthA) return monthB - monthA

        const dateA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0
        const dateB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0
        return dateB - dateA
      })
    }

    return Object.entries(byYear)
      .map(([year, yearInvoices]) => ({ year: Number(year), invoices: yearInvoices }))
      .sort((a, b) => b.year - a.year)
  }, [invoices])

  return (
    <Card>
      <Collapsible
        open={isExpanded}
        onOpenChange={onToggle}
      >
        <CollapsibleTrigger
          className="w-full p-4"
          aria-expanded={isExpanded}
          aria-controls={`invoice-group-${groupKey}`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span className="font-semibold">{clientName}</span>
              <span className="text-sm text-muted-foreground">
                ({invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'})
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {pendingCount} {pendingCount === 1 ? 'pendente' : 'pendentes'}
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {formatCurrency(totalAmount, groupCurrency)}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div id={`invoice-group-${groupKey}`} className="p-4 space-y-4" role="list" aria-label={`Invoices de ${clientName}`}>
            {yearSections.map(({ year, invoices: yearInvoices }) => (
              <div key={year}>
                {yearSections.length > 1 && (
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{year}</h3>
                )}
                <div className="space-y-3">
                  {yearInvoices.map((invoice) => (
                    <InvoiceItem
                      key={invoice.id}
                      invoice={invoice}
                      clients={clients}
                      deletingInvoice={deletingInvoice}
                      sendingEmail={sendingEmail}
                      onSendEmail={onSendEmail}
                      onStateChange={onStateChange}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onEditClientEmail={onEditClientEmail}
                      onShowToast={onShowToast}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export { InvoiceGroup }
export type { InvoiceGroupProps }
