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
  EurAmountDialog,
} from '@/components/features/invoices'
import SignedPDFUploadDialog from '@/components/features/invoices/SignedPDFUploadDialog'
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
  const [showSignedPDFDialog, setShowSignedPDFDialog] = useState(false)
  const [pendingEmailSend, setPendingEmailSend] = useState<{ invoiceId: string; recipientType: 'client' | 'accountant' } | null>(null)
  const [showEurAmountDialog, setShowEurAmountDialog] = useState(false)
  const [pendingAccountantSend, setPendingAccountantSend] = useState<{ invoiceId: string; invoiceAmount: number | null; clientCurrency: string } | null>(null)
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
      const key = inv.groupKey!
      if (!grouped[key]) {
        const year = inv.year || new Date(inv.uploaded_at || Date.now()).getFullYear()
        const clientName = inv.client_name || 'Sem cliente'
        grouped[key] = {
          groupLabel: inv.groupLabel!,
          clientName,
          year,
          invoices: [],
        }
      }
      grouped[key].invoices.push(inv)
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
    const invoice = allInvoices.find((inv: FormattedInvoice) => inv.id === invoiceId)
    if (!invoice) {
      toast({
        title: "Erro",
        description: "Invoice não encontrada",
        variant: "destructive",
      })
      return
    }

    // Check if invoice has files (signed PDF) - only for client emails
    if (recipientType === 'client') {
      const hasFiles = invoice.files && invoice.files.length > 0
      if (!hasFiles) {
        // Show dialog to sign/upload PDF
        setPendingEmailSend({ invoiceId, recipientType })
        setShowSignedPDFDialog(true)
        return
      }
    }

    // Check if sending to accountant and client uses GBP - show EUR amount dialog
    if (recipientType === 'accountant') {
      const invoiceClient = clients.find((c) => c.id === invoice.client_id)
      const clientCurrency = invoiceClient?.currency || 'EUR'
      if (clientCurrency === 'GBP') {
        setPendingAccountantSend({
          invoiceId,
          invoiceAmount: invoice.invoice_amount,
          clientCurrency,
        })
        setShowEurAmountDialog(true)
        return
      }
    }

    // Get template based on recipient type
    let template: EmailTemplate | undefined
    if (recipientType === 'client') {
      // For client emails, require template for the specific client
      template = emailTemplates.find((t: EmailTemplate) => t.client_id === invoice.client_id)
      if (!template) {
        toast({
          title: "Template Não Encontrado",
          description: `Nenhum template de email encontrado para ${invoice.client_name}. Por favor, crie um template para este cliente antes de enviar emails.`,
          variant: "destructive",
        })
        return
      }
    } else {
      // For accountant emails, require accountant template - NO FALLBACK
      template = emailTemplates.find((t: EmailTemplate) => t.client_id === null)
      if (!template) {
        toast({
          title: "Template Não Encontrado",
          description: `Nenhum template de email encontrado para o contador. Por favor, crie um template para o contador antes de enviar emails.`,
          variant: "destructive",
        })
        return
      }
    }

    // Proceed with email sending
    try {
      setSendingEmail(`${invoiceId}-${recipientType}`)

      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ]
      const monthName = invoice.month ? monthNames[invoice.month - 1] || String(invoice.month) : ''
      const monthYear = invoice.month && invoice.year ? `${monthName} ${invoice.year}` : (invoice.year ? String(invoice.year) : '')
      
      // Get client currency for formatting
      const invoiceClient = clients.find((c) => c.id === invoice.client_id)
      const invoiceCurrency = invoiceClient?.currency || 'EUR'
      
      const subject = template.subject
        .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
        .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
        .replace(/\{\{invoiceAmount\}\}/g, invoice.invoice_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: invoiceCurrency === 'GBP' ? 'GBP' : 'EUR' }).format(invoice.invoice_amount) : '')
        .replace(/\{\{month\}\}/g, invoice.month ? String(invoice.month) : '')
        .replace(/\{\{year\}\}/g, invoice.year ? String(invoice.year) : '')
        .replace(/\{\{monthYear\}\}/g, monthYear)
        .replace(/\{\{downloadLink\}\}/g, '')
      
      const body = template.body
        .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
        .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
        .replace(/\{\{invoiceAmount\}\}/g, invoice.invoice_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: invoiceCurrency === 'GBP' ? 'GBP' : 'EUR' }).format(invoice.invoice_amount) : '')
        .replace(/\{\{month\}\}/g, invoice.month ? String(invoice.month) : '')
        .replace(/\{\{year\}\}/g, invoice.year ? String(invoice.year) : '')
        .replace(/\{\{monthYear\}\}/g, monthYear)
        .replace(/\{\{downloadLink\}\}/g, '')

      await sendEmailMutation.mutateAsync({
        invoiceId,
        recipientType,
        subject,
        body,
        // invoiceAmountEur will be set by dialog for GBP invoices if needed
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
  }, [allInvoices, clients, toast, handleStateChange, sendEmailMutation, emailTemplates])

  const handleSignedPDFSuccess = useCallback(() => {
    if (pendingEmailSend) {
      // Retry sending email after PDF is signed/uploaded
      handleSendEmail(pendingEmailSend.invoiceId, pendingEmailSend.recipientType)
      setPendingEmailSend(null)
    }
  }, [pendingEmailSend, handleSendEmail])

  const handleEurAmountConfirm = useCallback(async (eurAmount: number) => {
    if (!pendingAccountantSend) return

    setShowEurAmountDialog(false)
    const { invoiceId } = pendingAccountantSend
    setPendingAccountantSend(null)

    // Proceed with email sending using the manually entered EUR amount
    try {
      setSendingEmail(`${invoiceId}-accountant`)

      const invoice = allInvoices.find((inv: FormattedInvoice) => inv.id === invoiceId)
      if (!invoice) {
        toast({
          title: "Erro",
          description: "Invoice não encontrada",
          variant: "destructive",
        })
        return
      }

      // For accountant emails, require accountant template - NO FALLBACK
      const template = emailTemplates.find((t: EmailTemplate) => t.client_id === null)
      if (!template) {
        toast({
          title: "Template Não Encontrado",
          description: `Nenhum template de email encontrado para o contador. Por favor, crie um template para o contador antes de enviar emails.`,
          variant: "destructive",
        })
        return
      }

      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ]
      const monthName = invoice.month ? monthNames[invoice.month - 1] || String(invoice.month) : ''
      const monthYear = invoice.month && invoice.year ? `${monthName} ${invoice.year}` : (invoice.year ? String(invoice.year) : '')
      
      const subject = template.subject
        .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
        .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
        .replace(/\{\{invoiceAmount\}\}/g, new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(eurAmount))
        .replace(/\{\{month\}\}/g, invoice.month ? String(invoice.month) : '')
        .replace(/\{\{year\}\}/g, invoice.year ? String(invoice.year) : '')
        .replace(/\{\{monthYear\}\}/g, monthYear)
        .replace(/\{\{downloadLink\}\}/g, '')
      
      const body = template.body
        .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
        .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
        .replace(/\{\{invoiceAmount\}\}/g, new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(eurAmount))
        .replace(/\{\{month\}\}/g, invoice.month ? String(invoice.month) : '')
        .replace(/\{\{year\}\}/g, invoice.year ? String(invoice.year) : '')
        .replace(/\{\{monthYear\}\}/g, monthYear)
        .replace(/\{\{downloadLink\}\}/g, '')

      await sendEmailMutation.mutateAsync({
        invoiceId,
        recipientType: 'accountant',
        subject,
        body,
        invoiceAmountEur: eurAmount,
      })

      await handleStateChange(invoiceId, { sentToAccountant: true })

      toast({
        title: "Email Enviado",
        description: "Email enviado para contador com sucesso",
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
  }, [pendingAccountantSend, allInvoices, emailTemplates, sendEmailMutation, handleStateChange, toast])

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
            onStateChange={handleStateChange}
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

      {pendingEmailSend && (() => {
        const invoice = allInvoices.find((inv: FormattedInvoice) => inv.id === pendingEmailSend.invoiceId)
        const invoiceClient = invoice ? clients.find((c) => c.id === invoice.client_id) : null
        const requiresTimesheet = invoiceClient?.requires_timesheet === true || invoiceClient?.requires_timesheet === 1
        
        return (
          <SignedPDFUploadDialog
            open={showSignedPDFDialog}
            onOpenChange={setShowSignedPDFDialog}
            invoiceId={pendingEmailSend.invoiceId}
            requiresTimesheet={requiresTimesheet}
            onSuccess={handleSignedPDFSuccess}
          />
        )
      })()}

      {pendingAccountantSend && (
        <EurAmountDialog
          open={showEurAmountDialog}
          onOpenChange={setShowEurAmountDialog}
          invoiceAmount={pendingAccountantSend.invoiceAmount}
          clientCurrency={pendingAccountantSend.clientCurrency}
          onConfirm={handleEurAmountConfirm}
          isLoading={sendingEmail === `${pendingAccountantSend.invoiceId}-accountant`}
        />
      )}
    </div>
  )
}

export default FileList
