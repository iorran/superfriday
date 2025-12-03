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
import { 
  getAllInvoices, 
  updateInvoiceState, 
  deleteInvoice,
  sendEmail,
  getEmailTemplates
} from '@/lib/client/db-client'
import { FileText, Calendar, Trash2, Mail, User, CheckCircle2, Send, Edit, Loader2 } from 'lucide-react'
import FileUpload from './FileUpload'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface FileListProps {
  refreshTrigger?: number
}

export default function FileList({ refreshTrigger }: FileListProps) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const { toast } = useToast()

  // Get current month key (YYYY-MM format)
  const currentMonthKey = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  // Initialize: expand current month
  useEffect(() => {
    setExpandedMonths(new Set([currentMonthKey]))
  }, [currentMonthKey])

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const invoicesList = await getAllInvoices()
      
      // Format invoices
      const formattedInvoices = invoicesList.map((inv: any) => {
        // Use month/year from invoice, or fallback to uploaded_at
        const monthKey = inv.year && inv.month 
          ? `${inv.year}-${String(inv.month).padStart(2, '0')}`
          : currentMonthKey
        
        const monthName = inv.year && inv.month
          ? new Date(inv.year, inv.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
          : new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

        const date = inv.uploaded_at ? new Date(inv.uploaded_at) : new Date()

        return {
          ...inv,
          lastModified: date,
          monthKey,
          monthName,
          sentToClient: inv.sent_to_client === 1 || inv.sent_to_client === true,
          paymentReceived: inv.payment_received === 1 || inv.payment_received === true,
          sentToAccountant: inv.sent_to_accountant === 1 || inv.sent_to_accountant === true,
        }
      })

      setInvoices(formattedInvoices)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar invoices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, currentMonthKey])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices, refreshTrigger])

  // Group invoices by month
  const invoicesByMonth = useMemo(() => {
    const grouped: Record<string, { monthName: string; invoices: any[] }> = {}
    invoices.forEach((inv) => {
      if (!grouped[inv.monthKey]) {
        grouped[inv.monthKey] = {
          monthName: inv.monthName,
          invoices: [],
        }
      }
      grouped[inv.monthKey].invoices.push(inv)
    })
    return grouped
  }, [invoices])

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey)
      } else {
        newSet.add(monthKey)
      }
      return newSet
    })
  }

  const handleStateChange = useCallback(async (invoiceId: string, updates: {
    sentToClient?: boolean
    paymentReceived?: boolean
    sentToAccountant?: boolean
  }) => {
    try {
      await updateInvoiceState(invoiceId, updates)
      
      // Update local state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { 
                ...inv, 
                sentToClient: updates.sentToClient !== undefined ? updates.sentToClient : inv.sentToClient,
                paymentReceived: updates.paymentReceived !== undefined ? updates.paymentReceived : inv.paymentReceived,
                sentToAccountant: updates.sentToAccountant !== undefined ? updates.sentToAccountant : inv.sentToAccountant,
              }
            : inv
        )
      )

      toast({
        title: "Estado Atualizado",
        description: "Estado da invoice atualizado com sucesso",
        variant: "default",
      })
    } catch (error: any) {
      console.error('Error updating invoice state:', error)
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar estado",
        variant: "destructive",
      })
    }
  }, [toast])

  const handleSendEmail = useCallback(async (invoiceId: string, recipientType: 'client' | 'accountant') => {
    try {
      setSendingEmail(`${invoiceId}-${recipientType}`)
      
      const invoice = invoices.find(inv => inv.id === invoiceId)
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Get templates for this recipient type
      // Templates are stored with type 'to_client' or 'to_account_manager'
      const templates = await getEmailTemplates()
      const templateType = recipientType === 'client' ? 'to_client' : 'to_account_manager'
      const recipientTemplates = templates.filter((t: any) => t.type === templateType)
      
      // Use the first template if available, otherwise use default
      let template = recipientTemplates.length > 0 ? recipientTemplates[0] : null
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

      await sendEmail({
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

      // Refresh invoices
      fetchInvoices()
    } catch (error: any) {
      console.error('Error sending email:', error)
      toast({
        title: "Erro ao Enviar Email",
        description: error.message || "Falha ao enviar email",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(null)
    }
  }, [invoices, toast, handleStateChange, fetchInvoices])

  const handleDelete = useCallback(async (invoiceId: string, clientName: string) => {
    try {
      setDeletingInvoice(invoiceId)
      
      await deleteInvoice(invoiceId)

      toast({
        title: "Invoice Deletada",
        description: `Invoice de ${clientName} foi deletada com sucesso`,
        variant: "default",
      })

      // Remove from local state
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId))
    } catch (error: any) {
      console.error('Error deleting invoice:', error)
      toast({
        title: "Erro",
        description: error.message || "Falha ao deletar invoice",
        variant: "destructive",
      })
    } finally {
      setDeletingInvoice(null)
    }
  }, [toast])

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

  const getTotalFileSize = (files: any[]) => {
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

  if (invoices.length === 0) {
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
      {Object.entries(invoicesByMonth).map(([monthKey, group]) => {
        const isExpanded = expandedMonths.has(monthKey)
        return (
          <Card key={monthKey}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleMonth(monthKey)}>
              <CollapsibleTrigger className="w-full p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold">{group.monthName}</span>
                  <span className="text-sm text-muted-foreground">
                    ({group.invoices.length} {group.invoices.length === 1 ? 'invoice' : 'invoices'})
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 space-y-3">
                  {group.invoices.map((invoice) => {
                    const invoiceFiles = invoice.files?.filter((f: any) => f.file_type === 'invoice') || []
                    const timesheetFiles = invoice.files?.filter((f: any) => f.file_type === 'timesheet') || []
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
                              <div>
                                <p className="font-medium">{invoice.client_name || 'Sem cliente'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(invoice.lastModified)} • {formatCurrency(invoice.invoice_amount)}
                                  {totalSize > 0 && ` • ${formatFileSize(totalSize)}`}
                                </p>
                              </div>
                            </div>

                            {/* Files list */}
                            {invoice.files && invoice.files.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {invoiceFiles.map((file: any) => (
                                  <p key={file.id} className="text-xs text-muted-foreground">
                                    📄 Invoice: {file.original_name}
                                  </p>
                                ))}
                                {timesheetFiles.map((file: any) => (
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
                                  handleStateChange(invoice.id, { paymentReceived: !invoice.paymentReceived })
                                }}
                                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors ${
                                  invoice.paymentReceived
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Pagamento Recebido
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!invoice.sentToAccountant && invoice.paymentReceived && sendingEmail !== `${invoice.id}-accountant`) {
                                    handleSendEmail(invoice.id, 'accountant')
                                  }
                                }}
                                disabled={!invoice.paymentReceived || sendingEmail === `${invoice.id}-accountant` || invoice.sentToAccountant}
                                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-all ${
                                  sendingEmail === `${invoice.id}-accountant`
                                    ? 'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 cursor-wait opacity-75'
                                    : invoice.sentToAccountant
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 cursor-default opacity-75'
                                    : invoice.paymentReceived
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 cursor-pointer'
                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed opacity-50'
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
                                    <strong className="block mt-2">"{invoice.client_name}"</strong>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(invoice.id, invoice.client_name)}
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
              fetchInvoices()
            }}
            onCancel={() => {
              setEditingInvoiceId(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
