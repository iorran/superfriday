'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useInvoices, useUpdateInvoiceState, useDeleteInvoice } from '@/lib/hooks/use-invoices'
import { useSendEmail } from '@/lib/hooks/use-email'
import { useEmailTemplates } from '@/lib/hooks/use-email-templates'
import { useClients, useUpdateClient } from '@/lib/hooks/use-clients'
import { FileText, Trash2, CheckCircle2, Send, Edit, Loader2, Mail, AlertCircle } from 'lucide-react'
import FileUpload from './FileUpload'
import type { Invoice, InvoiceFile, EmailTemplate } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface FormattedInvoice extends Invoice {
  groupKey: string
  groupLabel: string
  sentToClient: boolean
  sentToAccountant: boolean
}

export default function FileList() {
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
  const [editingClientEmail, setEditingClientEmail] = useState<{ clientId: string; email: string } | null>(null)
  const { toast } = useToast()

  // Get current year
  const currentYear = useMemo(() => {
    return new Date().getFullYear()
  }, [])

  // Initialize: expand first group
  useEffect(() => {
    if (invoicesData.length > 0) {
      // Will be set after grouping is calculated
    }
  }, [invoicesData.length])

  // Format invoices and group by client and year
  const invoicesByClientAndYear = useMemo(() => {
    const formatted: FormattedInvoice[] = invoicesData.map((inv: Invoice) => {
      const date = inv.uploaded_at ? new Date(inv.uploaded_at) : new Date()
      const year = inv.year || date.getFullYear()
      const clientName = inv.client_name || 'Sem cliente'
      const clientId = inv.client_id || 'unknown'
      
      // Create group key: clientId-year
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

    // Group by client and year
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

    // Sort invoices within each group by date (newest first)
    Object.values(grouped).forEach((group) => {
      group.invoices.sort((a, b) => {
        const dateA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0
        const dateB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0
        return dateB - dateA
      })
    })

    return grouped
  }, [invoicesData])

  // Initialize: expand first group or current year groups
  useEffect(() => {
    const groupKeys = Object.keys(invoicesByClientAndYear)
    if (groupKeys.length > 0 && expandedGroups.size === 0) {
      // Expand groups from current year first, or first group if none from current year
      const currentYearGroups = groupKeys.filter(key => {
        const group = invoicesByClientAndYear[key]
        return group.year === currentYear
      })
      
      if (currentYearGroups.length > 0) {
        setExpandedGroups(new Set(currentYearGroups))
      } else {
        setExpandedGroups(new Set([groupKeys[0]]))
      }
    }
  }, [invoicesByClientAndYear, currentYear, expandedGroups.size])

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }

  // Create flat list of all invoices for lookup
  const allInvoices = useMemo(() => {
    return Object.values(invoicesByClientAndYear).flatMap(group => group.invoices)
  }, [invoicesByClientAndYear])

  // Sort groups: by client name, then by year (descending)
  const sortedGroups = useMemo(() => {
    return Object.entries(invoicesByClientAndYear).sort(([, groupA], [, groupB]) => {
      // First sort by client name
      const clientCompare = groupA.clientName.localeCompare(groupB.clientName)
      if (clientCompare !== 0) return clientCompare
      // Then by year (descending)
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

      // Get templates for this recipient type
      // Templates are stored with type 'to_client' or 'to_account_manager'
      const templateType = recipientType === 'client' ? 'to_client' : 'to_account_manager'
      const recipientTemplates = emailTemplates.filter((t: EmailTemplate) => t.type === templateType)
      
      // Use the first template if available, otherwise use default
      const template = recipientTemplates.length > 0 ? recipientTemplates[0] : null
      let templateId: string | null = null
      let subject = ''
      let body = ''

      if (template) {
        templateId = template.id
        
        // Replace template variables in subject
        subject = template.subject
          .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
          .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
          .replace(/\{\{invoiceAmount\}\}/g, invoice.invoice_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(invoice.invoice_amount) : '')
          .replace(/\{\{dueDate\}\}/g, invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('pt-PT') : '')
          .replace(/\{\{downloadLink\}\}/g, '') // Not applicable for attachments
        
        // Replace template variables in body
        body = template.body
          .replace(/\{\{clientName\}\}/g, invoice.client_name || '')
          .replace(/\{\{invoiceName\}\}/g, invoice.id || '')
          .replace(/\{\{invoiceAmount\}\}/g, invoice.invoice_amount ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(invoice.invoice_amount) : '')
          .replace(/\{\{dueDate\}\}/g, invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('pt-PT') : '')
          .replace(/\{\{downloadLink\}\}/g, '') // Not applicable for attachments
      } else {
        // Fallback to default if no template found
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

      // Update state based on recipient type
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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString('default', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '€0,00'
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const getTotalFileSize = (files: InvoiceFile[]) => {
    return files?.reduce((total, file) => total + (file.file_size || 0), 0) || 0
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando invoices...</p>
        </CardContent>
      </Card>
    )
  }

  if (Object.keys(invoicesByClientAndYear).length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Nenhuma invoice criada ainda.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full space-y-4">
      {sortedGroups.map(([groupKey, group]) => {
        const isExpanded = expandedGroups.has(groupKey)
        const totalAmount = group.invoices.reduce((sum, inv) => sum + (inv.invoice_amount || 0), 0)
        return (
          <Card key={groupKey}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(groupKey)}>
              <CollapsibleTrigger className="w-full p-4">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-semibold">{group.groupLabel}</span>
                    <span className="text-sm text-muted-foreground">
                      ({group.invoices.length} {group.invoices.length === 1 ? 'invoice' : 'invoices'})
                    </span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 space-y-3">
                  {group.invoices.map((invoice) => {
                    const invoiceFiles = invoice.files?.filter((f: InvoiceFile) => f.file_type === 'invoice') || []
                    const timesheetFiles = invoice.files?.filter((f: InvoiceFile) => f.file_type === 'timesheet') || []
                    const totalSize = getTotalFileSize(invoice.files || [])

                    return (
                      <div
                        key={invoice.id}
                        className="p-4 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{invoice.client_name || 'Sem cliente'}</p>
                                  {(!invoice.client_email || invoice.client_email.trim() === '') && (
                                    <span 
                                      className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 px-2 py-0.5 rounded cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const client = clients.find(c => c.id === invoice.client_id)
                                        if (client) {
                                          setEditingClientEmail({ clientId: client.id, email: client.email || '' })
                                        }
                                      }}
                                      title="Clique para adicionar email"
                                    >
                                      <AlertCircle className="h-3 w-3" />
                                      Email ausente
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(invoice.lastModified)} • {formatCurrency(invoice.invoice_amount)}
                                    {totalSize > 0 && ` • ${formatFileSize(totalSize)}`}
                                  </p>
                                  {invoice.client_email && invoice.client_email.trim() !== '' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const client = clients.find(c => c.id === invoice.client_id)
                                        if (client) {
                                          setEditingClientEmail({ clientId: client.id, email: client.email || '' })
                                        }
                                      }}
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                      title="Editar email do cliente"
                                    >
                                      <Mail className="h-3 w-3" />
                                      {invoice.client_email}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Files list */}
                            {invoice.files && invoice.files.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {invoiceFiles.map((file: InvoiceFile) => (
                                  <p key={file.id} className="text-xs text-muted-foreground">
                                    📄 Invoice: {file.original_name}
                                  </p>
                                ))}
                                {timesheetFiles.map((file: InvoiceFile) => (
                                  <p key={file.id} className="text-xs text-muted-foreground">
                                    📋 Timesheet: {file.original_name}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Workflow States */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!invoice.sentToClient && sendingEmail !== `${invoice.id}-client`) {
                                    handleSendEmail(invoice.id, 'client')
                                  }
                                }}
                                disabled={sendingEmail === `${invoice.id}-client` || invoice.sentToClient}
                                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-all ${
                                  sendingEmail === `${invoice.id}-client`
                                    ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200 cursor-wait opacity-75'
                                    : invoice.sentToClient
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 cursor-default opacity-75'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 cursor-pointer'
                                } ${sendingEmail === `${invoice.id}-client` ? 'animate-pulse' : ''}`}
                              >
                                {sendingEmail === `${invoice.id}-client` ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Enviando...
                                  </>
                                ) : invoice.sentToClient ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Enviado para Cliente
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-3 w-3" />
                                    Enviar para Cliente
                                  </>
                                )}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!invoice.sentToAccountant && !invoice.sentToClient && sendingEmail !== `${invoice.id}-accountant`) {
                                    toast({
                                      title: "Ação não permitida",
                                      description: "Você deve enviar a invoice para o cliente antes de enviar para o contador",
                                      variant: "destructive",
                                    })
                                    return
                                  }
                                  if (!invoice.sentToAccountant && sendingEmail !== `${invoice.id}-accountant`) {
                                    handleSendEmail(invoice.id, 'accountant')
                                  }
                                }}
                                disabled={sendingEmail === `${invoice.id}-accountant` || invoice.sentToAccountant || !invoice.sentToClient}
                                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-all ${
                                  sendingEmail === `${invoice.id}-accountant`
                                    ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 cursor-wait opacity-75'
                                    : invoice.sentToAccountant
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 cursor-default opacity-75'
                                    : !invoice.sentToClient
                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed opacity-50'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 cursor-pointer'
                                } ${sendingEmail === `${invoice.id}-accountant` ? 'animate-pulse' : ''}`}
                              >
                                {sendingEmail === `${invoice.id}-accountant` ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Enviando...
                                  </>
                                ) : invoice.sentToAccountant ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Enviado para Contador
                                  </>
                                ) : !invoice.sentToClient ? (
                                  <>
                                    <Send className="h-3 w-3" />
                                    Enviar para Cliente Primeiro
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-3 w-3" />
                                    Enviar para Contador
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingInvoiceId(invoice.id)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  disabled={deletingInvoice === invoice.id}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso irá deletar permanentemente a invoice
                                    <strong className="block mt-2">&ldquo;{invoice.client_name}&rdquo;</strong>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(invoice.id, invoice.client_name || '')}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={deletingInvoice === invoice.id}
                                  >
                                    {deletingInvoice === invoice.id ? 'Deletando...' : 'Deletar'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}

      <Dialog open={editingInvoiceId !== null} onOpenChange={(open) => {
        if (!open) {
          setEditingInvoiceId(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Invoice</DialogTitle>
          </DialogHeader>
          <FileUpload
            editingInvoiceId={editingInvoiceId}
            onUploadSuccess={() => {
              setEditingInvoiceId(null)
            }}
            onCancel={() => {
              setEditingInvoiceId(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Quick Edit Client Email Dialog */}
      <Dialog open={!!editingClientEmail} onOpenChange={(open) => !open && setEditingClientEmail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Email do Cliente</DialogTitle>
          </DialogHeader>
          {editingClientEmail && (() => {
            const client = clients.find(c => c.id === editingClientEmail.clientId)
            if (!client) return null
            
            return (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Cliente:</p>
                  <p className="text-sm text-muted-foreground">{client.name}</p>
                </div>
                <div>
                  <label htmlFor="clientEmail" className="text-sm font-medium mb-1 block">
                    Email:
                  </label>
                  <input
                    id="clientEmail"
                    type="email"
                    value={editingClientEmail.email}
                    onChange={(e) => setEditingClientEmail({ ...editingClientEmail, email: e.target.value })}
                    className="w-full p-2 border rounded-md bg-background"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingClientEmail(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!editingClientEmail) return
                      
                      try {
                        await updateClientMutation.mutateAsync({
                          clientId: editingClientEmail.clientId,
                          data: { email: editingClientEmail.email.trim() || '' },
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
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
