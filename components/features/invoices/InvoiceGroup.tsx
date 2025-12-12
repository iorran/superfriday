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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
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
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent id={`invoice-group-${groupKey}`}>
          <div className="p-4 space-y-3" role="list" aria-label={`Invoices de ${groupLabel}`}>
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

