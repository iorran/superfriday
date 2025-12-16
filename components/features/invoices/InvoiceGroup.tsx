'use client'

import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { FileText } from 'lucide-react'
import { InvoiceItem } from './InvoiceItem'
import type { FormattedInvoice } from './InvoiceItem'
import type { Client } from '@/types'

interface InvoiceGroupProps {
  groupKey: string
  groupLabel: string
  invoices: FormattedInvoice[]
  totalAmount: number
  isExpanded: boolean
  onToggle: () => void
  clients: Client[]
  deletingInvoice: string | null
  sendingEmail: string | null
  onSendEmail: (invoiceId: string, recipientType: 'client' | 'accountant') => void
  onDelete: (invoiceId: string, clientName: string) => void
  onEdit: (invoiceId: string) => void
  onEditClientEmail: (clientId: string, email: string) => void
  onShowToast: (title: string, description: string, variant: 'default' | 'destructive') => void
}

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency === 'GBP' ? 'GBP' : 'EUR',
  }).format(amount)
}

const InvoiceGroup = ({
  groupKey,
  groupLabel,
  invoices,
  totalAmount,
  isExpanded,
  onToggle,
  clients,
  deletingInvoice,
  sendingEmail,
  onSendEmail,
  onDelete,
  onEdit,
  onEditClientEmail,
  onShowToast,
}: InvoiceGroupProps) => {
  // Get the client for this group (all invoices in a group should have the same client)
  const groupClient = invoices.length > 0 && invoices[0].client_id
    ? clients.find((c) => c.id === invoices[0].client_id)
    : null
  const groupCurrency = groupClient?.currency || 'EUR'
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
              <span className="font-semibold">{groupLabel}</span>
              <span className="text-sm text-muted-foreground">
                ({invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'})
              </span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {formatCurrency(totalAmount, groupCurrency)}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div id={`invoice-group-${groupKey}`} className="p-4 space-y-3" role="list" aria-label={`Invoices de ${groupLabel}`}>
            {invoices.map((invoice) => (
              <InvoiceItem
                key={invoice.id}
                invoice={invoice}
                clients={clients}
                deletingInvoice={deletingInvoice}
                sendingEmail={sendingEmail}
                onSendEmail={onSendEmail}
                onDelete={onDelete}
                onEdit={onEdit}
                onEditClientEmail={onEditClientEmail}
                onShowToast={onShowToast}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export { InvoiceGroup }
export type { InvoiceGroupProps }

