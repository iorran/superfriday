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

  // Format invoices and group by client (company-level)
  const invoicesByClient = useMemo(() => {
    const formatted: FormattedInvoice[] = invoicesData.map((inv: Invoice) => {
      const date = inv.uploaded_at ? new Date(inv.uploaded_at) : new Date()
      const clientName = inv.client_name || 'Sem cliente'
      const clientId = inv.client_id || 'unknown'

      return {
        ...inv,
        lastModified: date,
        groupKey: clientId,
        groupLabel: clientName,
        sentToClient: inv.sent_to_client === 1 || inv.sent_to_client === true,
        sentToAccountant: inv.sent_to_accountant === 1 || inv.sent_to_accountant === true,
      }
    })

    const grouped: Record<string, { clientName: string; clientId: string; invoices: FormattedInvoice[] }> = {}
    formatted.forEach((inv: FormattedInvoice) => {
      const key = inv.client_id || 'unknown'
      if (!grouped[key]) {
        grouped[key] = {
          clientName: inv.client_name || 'Sem cliente',
          clientId: key,
          invoices: [],
        }
      }
      grouped[key].invoices.push(inv)
    })

    return grouped
  }, [invoicesData])

  // Initialize: auto-expand companies that have pending actions
  const hasInitialized = useRef(false)

  useEffect(() => {
    const clientKeys = Object.keys(invoicesByClient)

    if (clientKeys.length > 0 && !hasInitialized.current) {
      const pendingClients = clientKeys.filter(key => {
        const group = invoicesByClient[key]
        return group.invoices.some(inv => !inv.sentToClient || !inv.sentToAccountant)
      })

      if (pendingClients.length > 0) {
        setExpandedGroups(new Set(pendingClients))
      } else {
        setExpandedGroups(new Set([clientKeys[0]]))
      }
      hasInitialized.current = true
    }
  }, [invoicesByClient])

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
    Object.keys(invoicesByClient).forEach((key) => {
      handlers[key] = () => toggleGroup(key)
    })
    return handlers
  }, [invoicesByClient, toggleGroup])

  const allInvoices = useMemo(() => {
    return Object.values(invoicesByClient).flatMap(group => group.invoices)
  }, [invoicesByClient])

  // Sort companies: most pending actions first, then alphabetically
  const sortedGroups = useMemo(() => {
    return Object.entries(invoicesByClient).sort(([, groupA], [, groupB]) => {
      const pendingA = groupA.invoices.filter(inv => !inv.sentToClient || !inv.sentToAccountant).length
      const pendingB = groupB.invoices.filter(inv => !inv.sentToClient || !inv.sentToAccountant).length
      if (pendingB !== pendingA) return pendingB - pendingA
      return groupA.clientName.localeCompare(groupB.clientName)
    })
  }, [invoicesByClient])

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

    // Proceed with email sending - template replacement is handled by the API
    try {
      setSendingEmail(`${invoiceId}-${recipientType}`)

      await sendEmailMutation.mutateAsync({
        invoiceId,
        recipientType,
      })

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
  }, [allInvoices, clients, toast, sendEmailMutation, emailTemplates])

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

    // Proceed with email sending - template replacement is handled by the API
    try {
      setSendingEmail(`${invoiceId}-accountant`)

      await sendEmailMutation.mutateAsync({
        invoiceId,
        recipientType: 'accountant',
        invoiceAmountEur: eurAmount,
      })

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
  }, [pendingAccountantSend, sendEmailMutation, toast])

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

  if (Object.keys(invoicesByClient).length === 0) {
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
        const handleToggle = toggleHandlers[groupKey] || (() => toggleGroup(groupKey))

        return (
          <InvoiceGroup
            key={groupKey}
            groupKey={groupKey}
            clientName={group.clientName}
            invoices={group.invoices}
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
