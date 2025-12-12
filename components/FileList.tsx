'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useInvoices, useUpdateInvoiceState, useDeleteInvoice } from '@/hooks/use-invoices'
import { useSendEmail } from '@/hooks/use-email'
import { useEmailTemplates } from '@/hooks/use-email-templates'
import { useClients, useUpdateClient } from '@/hooks/use-clients'
import {
  InvoiceGroup,
  InvoiceEditDialog,
  ClientEmailDialog,
} from '@/components/features/invoices'
import type { FormattedInvoice, EditingClientEmail } from '@/components/features/invoices'
import type { Invoice, EmailTemplate } from '@/types'

const FileList = () => {
  const { data: invoicesData = [], isLoading: loading } = useInvoices()
  const { data: clients = [] } = useClients()
  const updateInvoiceStateMutation = useUpdateInvoiceState()
  const deleteInvoiceMutation = useDeleteInvoice()
  const sendEmailMutation = useSendEmail()
  const updateClientMutation = useUpdateClient()
  const { data: emailTemplates = [] } = useEmailTemplates()
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [editingClientEmail, setEditingClientEmail] = useState<EditingClientEmail | null>(null)
  const { toast } = useToast()

  // Get current year
  const currentYear = useMemo(() => {
    return new Date().getFullYear()
  }, [])

  // Format invoices and group by client and year
  const invoicesByClientAndYear = useMemo(() => {
    const formatted: FormattedInvoice[] = invoicesData.map((inv: Invoice) => {
      const date = inv.uploaded_at ? new Date(inv.uploaded_at) : new Date()
      const year = inv.year || date.getFullYear()
      const clientName = inv.client_name || 'Sem cliente'
      const clientId = inv.client_id || 'unknown'
      
      const groupKey = `${clientId}-${year}`
      const groupLabel = `${clientName} - ${year}`

      return {
        ...inv,
        lastModified: date,
        groupKey,
        groupLabel,
        sentToClient: inv.sent_to_client === 1 || inv.sent_to_client === true,
        sentToAccountant: inv.sent_to_accountant === 1 || inv.sent_to_accountant === true,
      }
    })

    const grouped: Record<string, { groupLabel: string; clientName: string; year: number; invoices: FormattedInvoice[] }> = {}
    formatted.forEach((inv: FormattedInvoice) => {
      if (!grouped[inv.groupKey]) {
        const year = inv.year || new Date(inv.uploaded_at || Date.now()).getFullYear()
        const clientName = inv.client_name || 'Sem cliente'
        grouped[inv.groupKey] = {
          groupLabel: inv.groupLabel,
          clientName,
          year,
          invoices: [],
        }
      }
      grouped[inv.groupKey].invoices.push(inv)
    })

    // Sort invoices within each group
    Object.values(grouped).forEach((group) => {
      group.invoices.sort((a, b) => {
        const yearA = a.year || 0
        const yearB = b.year || 0
        if (yearB !== yearA) return yearB - yearA
        
        const monthA = a.month || 0
        const monthB = b.month || 0
        if (monthB !== monthA) return monthB - monthA
        
        const dateA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0
        const dateB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0
        return dateB - dateA
      })
    })

    return grouped
  }, [invoicesData])

  // Initialize: expand first group or current year groups
  const hasInitialized = useRef(false)
  
  useEffect(() => {
    const groupKeys = Object.keys(invoicesByClientAndYear)
    
    if (groupKeys.length > 0 && !hasInitialized.current) {
      const currentYearGroups = groupKeys.filter(key => {
        const group = invoicesByClientAndYear[key]
        return group.year === currentYear
      })
      
      if (currentYearGroups.length > 0) {
        setExpandedGroups(new Set(currentYearGroups))
      } else {
        setExpandedGroups(new Set([groupKeys[0]]))
      }
      hasInitialized.current = true
    }
  }, [invoicesByClientAndYear, currentYear])

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }, [])
  
  const toggleHandlers = useMemo(() => {
    const handlers: Record<string, () => void> = {}
    Object.keys(invoicesByClientAndYear).forEach((key) => {
      handlers[key] = () => toggleGroup(key)
    })
    return handlers
  }, [invoicesByClientAndYear, toggleGroup])

  const allInvoices = useMemo(() => {
    return Object.values(invoicesByClientAndYear).flatMap(group => group.invoices)
  }, [invoicesByClientAndYear])

  const sortedGroups = useMemo(() => {
    return Object.entries(invoicesByClientAndYear).sort(([, groupA], [, groupB]) => {
      const clientCompare = groupA.clientName.localeCompare(groupB.clientName)
      if (clientCompare !== 0) return clientCompare
      return groupB.year - groupA.year
    })
  }, [invoicesByClientAndYear])

  const handleStateChange = useCallback(async (invoiceId: string, updates: {
    sentToClient?: boolean
    sentToAccountant?: boolean
  }) => {
    try {
      await updateInvoiceStateMutation.mutateAsync({ invoiceId, updates })
      toast({
        title: "Estado Atualizado",
        description: "Estado da invoice atualizado com sucesso",
        variant: "default",
      })
    } catch (error: unknown) {
      console.error('Error updating invoice state:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar estado",
        variant: "destructive",
      })
    }
  }, [updateInvoiceStateMutation, toast])

  const handleSendEmail = useCallback(async (invoiceId: string, recipientType: 'client' | 'accountant') => {
    try {
      setSendingEmail(`${invoiceId}-${recipientType}`)
      
      const invoice = allInvoices.find((inv: FormattedInvoice) => inv.id === invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      const templateType = recipientType === 'client' ? 'to_client' : 'to_account_manager'
      const recipientTemplates = emailTemplates.filter((t: EmailTemplate) => t.type === templateType)
      
      const template = recipientTemplates.length > 0 ? recipientTemplates[0] : null
      let templateId: string | null = null
      let subject = ''
      let body = ''

      if (template) {
        templateId = template.id
        
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ]
        const monthName = invoice.month ? monthNames[invoice.month - 1] || String(invoice.month) : ''
        const monthYear = invoice.month && invoice.year ? `${monthName} ${invoice.year}` : (invoice.year ? String(invoice.year) : '')
        
        subject = template.subject
          .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
          .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
          .replace(/\{\{invoiceAmount\}\}/g, invoice.invoice_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(invoice.invoice_amount) : '')
          .replace(/\{\{month\}\}/g, invoice.month ? String(invoice.month) : '')
          .replace(/\{\{year\}\}/g, invoice.year ? String(invoice.year) : '')
          .replace(/\{\{monthYear\}\}/g, monthYear)
          .replace(/\{\{downloadLink\}\}/g, '')
        
        body = template.body
          .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
          .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
          .replace(/\{\{invoiceAmount\}\}/g, invoice.invoice_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(invoice.invoice_amount) : '')
          .replace(/\{\{month\}\}/g, invoice.month ? String(invoice.month) : '')
          .replace(/\{\{year\}\}/g, invoice.year ? String(invoice.year) : '')
          .replace(/\{\{monthYear\}\}/g, monthYear)
          .replace(/\{\{downloadLink\}\}/g, '')
      } else {
        subject = recipientType === 'client' 
          ? `Invoice - ${invoice.client_name}`
          : `Invoice para ${invoice.client_name}`

        body = recipientType === 'client'
          ? `Olá,\n\nSegue em anexo a invoice solicitada.\n\nAtenciosamente`
          : `Olá,\n\nSegue em anexo a invoice de ${invoice.client_name}.\n\nAtenciosamente`
      }

      await sendEmailMutation.mutateAsync({
        invoiceId,
        recipientType,
        templateId,
        subject,
        body,
      })

      if (recipientType === 'client') {
        await handleStateChange(invoiceId, { sentToClient: true })
      } else {
        await handleStateChange(invoiceId, { sentToAccountant: true })
      }

      toast({
        title: "Email Enviado",
        description: `Email enviado para ${recipientType === 'client' ? 'cliente' : 'contador'} com sucesso`,
        variant: "default",
      })
    } catch (error: unknown) {
      console.error('Error sending email:', error)
      const errorMessage = error instanceof Error ? error.message : "Falha ao enviar email"
      toast({
        title: "Erro ao Enviar Email",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSendingEmail(null)
    }
  }, [allInvoices, toast, handleStateChange, sendEmailMutation, emailTemplates])

  const handleDelete = useCallback(async (invoiceId: string, clientName: string) => {
    try {
      setDeletingInvoice(invoiceId)
      
      await deleteInvoiceMutation.mutateAsync(invoiceId)

      toast({
        title: "Invoice Deletada",
        description: `Invoice de ${clientName} foi deletada com sucesso`,
        variant: "default",
      })
    } catch (error: unknown) {
      console.error('Error deleting invoice:', error)
      const errorMessage = error instanceof Error ? error.message : "Falha ao deletar invoice"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setDeletingInvoice(null)
    }
  }, [toast, deleteInvoiceMutation])

  const handleShowToast = useCallback((title: string, description: string, variant: 'default' | 'destructive') => {
    toast({ title, description, variant })
  }, [toast])

  const handleEditClientEmail = useCallback((clientId: string, email: string) => {
    setEditingClientEmail({ clientId, email })
  }, [])

  const handleClientEmailUpdate = useCallback(async (clientId: string, email: string) => {
    const client = clients.find(c => c.id === clientId)
    if (!client) return

    try {
      await updateClientMutation.mutateAsync({
        clientId,
        data: { email },
      })
      
      toast({
        title: "Email Atualizado",
        description: `Email do cliente ${client.name} foi atualizado com sucesso.`,
        variant: "default",
      })
      
      setEditingClientEmail(null)
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar email",
        variant: "destructive",
      })
    }
  }, [clients, updateClientMutation, toast])

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground" role="status" aria-live="polite">
            Carregando invoices...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (Object.keys(invoicesByClientAndYear).length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground" role="status">
            Nenhuma invoice criada ainda.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-4" role="region" aria-label="Lista de invoices" data-tour="main-content">
      {sortedGroups.map(([groupKey, group]) => {
        const totalAmount = group.invoices.reduce((sum, inv) => sum + (inv.invoice_amount || 0), 0)
        const handleToggle = toggleHandlers[groupKey] || (() => toggleGroup(groupKey))
        
        return (
          <InvoiceGroup
            key={groupKey}
            groupKey={groupKey}
            groupLabel={group.groupLabel}
            invoices={group.invoices}
            totalAmount={totalAmount}
            isExpanded={expandedGroups.has(groupKey)}
            onToggle={handleToggle}
            clients={clients}
            deletingInvoice={deletingInvoice}
            sendingEmail={sendingEmail}
            onSendEmail={handleSendEmail}
            onDelete={handleDelete}
            onEdit={setEditingInvoiceId}
            onEditClientEmail={handleEditClientEmail}
            onShowToast={handleShowToast}
          />
        )
      })}

      <InvoiceEditDialog
        invoiceId={editingInvoiceId}
        onClose={() => setEditingInvoiceId(null)}
      />

      <ClientEmailDialog
        editingClientEmail={editingClientEmail}
        clients={clients}
        onClose={() => setEditingClientEmail(null)}
        onUpdate={handleClientEmailUpdate}
        onEmailChange={(email) => setEditingClientEmail(prev => prev ? { ...prev, email } : null)}
      />
    </div>
  )
}

export default FileList
