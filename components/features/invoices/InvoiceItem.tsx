'use client'

import { Button } from '@/components/ui/button'
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
import { FileText, Trash2, CheckCircle2, Send, Edit, Loader2, Mail, AlertCircle, Download } from 'lucide-react'
import type { InvoiceFile, Client } from '@/types'

interface FormattedInvoice {
  id: string
  client_id?: string
  client_name?: string
  client_email?: string
  invoice_amount: number | null
  month: number | null
  year: number | null
  uploaded_at?: string
  files?: InvoiceFile[]
  sentToClient: boolean
  sentToAccountant: boolean
  lastModified?: Date
  groupKey?: string
  groupLabel?: string
}

interface InvoiceItemProps {
  invoice: FormattedInvoice
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

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatInvoiceDate = (month: number | null, year: number | null, uploadedAt?: string) => {
  if (!month || !year) return ''
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  const monthName = monthNames[month - 1] || String(month)
  
  let day = 1
  if (uploadedAt) {
    try {
      const date = new Date(uploadedAt)
      if (!isNaN(date.getTime())) {
        day = date.getDate()
      }
    } catch {
      // Use default day 1
    }
  }
  
  return `${day} ${monthName} ${year}`
}

const formatCurrency = (amount: number | null | undefined, currency: string = 'EUR') => {
  if (amount === null || amount === undefined) {
    const symbol = currency === 'GBP' ? '£' : '€'
    return `${symbol}0,00`
  }
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency === 'GBP' ? 'GBP' : 'EUR',
  }).format(amount)
}

const getTotalFileSize = (files: InvoiceFile[]) => {
  return files?.reduce((total, file) => total + (file.file_size || 0), 0) || 0
}

const InvoiceItem = ({
  invoice,
  clients,
  deletingInvoice,
  sendingEmail,
  onSendEmail,
  onStateChange,
  onDelete,
  onEdit,
  onEditClientEmail,
  onShowToast,
}: InvoiceItemProps) => {
  // Get client currency
  const client = clients.find((c) => c.id === invoice.client_id)
  const clientCurrency = client?.currency || 'EUR'
  const invoiceFiles = invoice.files?.filter((f: InvoiceFile) => f.file_type === 'invoice') || []
  const timesheetFiles = invoice.files?.filter((f: InvoiceFile) => f.file_type === 'timesheet') || []
  const totalSize = getTotalFileSize(invoice.files || [])

  const handleEditClientEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    const client = clients.find(c => c.id === invoice.client_id)
    if (client) {
      onEditClientEmail(client.id, client.email || '')
    }
  }

  const handleSendToClient = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!invoice.sentToClient && sendingEmail !== `${invoice.id}-client`) {
      onSendEmail(invoice.id, 'client')
    }
  }

  const handleSendToAccountant = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!invoice.sentToAccountant && !invoice.sentToClient && sendingEmail !== `${invoice.id}-accountant`) {
      onShowToast(
        "Ação não permitida",
        "Você deve enviar a invoice para o cliente antes de enviar para o contador",
        "destructive"
      )
      return
    }
    if (!invoice.sentToAccountant && sendingEmail !== `${invoice.id}-accountant`) {
      onSendEmail(invoice.id, 'accountant')
    }
  }

  const handleDownloadFile = async (fileKey: string, originalName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const encodedFileKey = encodeURIComponent(fileKey)
      const response = await fetch(`/api/files/${encodedFileKey}`)

      if (!response.ok) {
        throw new Error('Falha ao baixar arquivo')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = originalName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      onShowToast(
        "Download Concluído",
        `Arquivo ${originalName} baixado com sucesso`,
        "default"
      )
    } catch (error) {
      console.error('Error downloading file:', error)
      onShowToast(
        "Erro no Download",
        error instanceof Error ? error.message : "Falha ao baixar arquivo",
        "destructive"
      )
    }
  }

  const handleToggleClientStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newStatus = !invoice.sentToClient
    onStateChange(invoice.id, { sentToClient: newStatus })
  }

  const handleToggleAccountantStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!invoice.sentToClient) {
      onShowToast(
        "Ação não permitida",
        "Você deve marcar como enviado para o cliente antes de marcar como enviado para o contador",
        "destructive"
      )
      return
    }
    const newStatus = !invoice.sentToAccountant
    onStateChange(invoice.id, { sentToAccountant: newStatus })
  }

  return (
    <div
      className="p-4 rounded-md border bg-card hover:bg-accent/50 transition-colors"
      role="listitem"
      aria-label={`Invoice de ${invoice.client_name || 'cliente desconhecido'} - ${formatCurrency(invoice.invoice_amount, clientCurrency)}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {formatInvoiceDate(invoice.month, invoice.year, invoice.uploaded_at) ? (
                    <>
                      {formatInvoiceDate(invoice.month, invoice.year, invoice.uploaded_at)}
                      {invoice.client_name && ` - ${invoice.client_name}`}
                    </>
                  ) : (
                    invoice.client_name || 'Sem cliente'
                  )}
                </p>
                {(!invoice.client_email || invoice.client_email.trim() === '') && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 px-2 py-0.5 rounded cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                    onClick={handleEditClientEmail}
                    aria-label="Clique para adicionar email do cliente"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleEditClientEmail(e as unknown as React.MouseEvent)
                      }
                    }}
                  >
                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                    Email ausente
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(invoice.invoice_amount, clientCurrency)}
                  {totalSize > 0 && ` • ${formatFileSize(totalSize)}`}
                </p>
                {invoice.client_email && invoice.client_email.trim() !== '' && (
                  <button
                    type="button"
                    onClick={handleEditClientEmail}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    aria-label="Editar email do cliente"
                    tabIndex={0}
                  >
                    <Mail className="h-3 w-3" aria-hidden="true" />
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
          <div className="flex items-center gap-2 mt-3 flex-wrap" role="group" aria-label="Ações de envio">
            <button
              type="button"
              onClick={handleSendToClient}
              disabled={sendingEmail === `${invoice.id}-client` || invoice.sentToClient}
              aria-label={invoice.sentToClient ? 'Enviado para cliente' : 'Enviar para cliente'}
              aria-busy={sendingEmail === `${invoice.id}-client`}
              tabIndex={0}
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
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Enviando...
                </>
              ) : invoice.sentToClient ? (
                <>
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Enviado para Cliente
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" aria-hidden="true" />
                  Enviar para Cliente
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendToAccountant}
              disabled={sendingEmail === `${invoice.id}-accountant` || invoice.sentToAccountant || !invoice.sentToClient}
              aria-label={invoice.sentToAccountant ? 'Enviado para contador' : 'Enviar para contador'}
              aria-busy={sendingEmail === `${invoice.id}-accountant`}
              aria-disabled={!invoice.sentToClient}
              tabIndex={0}
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
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Enviando...
                </>
              ) : invoice.sentToAccountant ? (
                <>
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  Enviado para Contador
                </>
              ) : !invoice.sentToClient ? (
                <>
                  <Send className="h-3 w-3" aria-hidden="true" />
                  Enviar para Cliente Primeiro
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" aria-hidden="true" />
                  Enviar para Contador
                </>
              )}
            </button>
          </div>

          {/* Manual Status Toggle */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap" role="group" aria-label="Status manual">
            <p className="text-xs text-muted-foreground mr-2">Status Manual:</p>
            <button
              type="button"
              onClick={handleToggleClientStatus}
              aria-label={invoice.sentToClient ? 'Marcar como não enviado para cliente' : 'Marcar como enviado para cliente'}
              tabIndex={0}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-all ${
                invoice.sentToClient
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 cursor-pointer'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {invoice.sentToClient ? 'Cliente ✓' : 'Cliente'}
            </button>

            <button
              type="button"
              onClick={handleToggleAccountantStatus}
              disabled={!invoice.sentToClient}
              aria-label={invoice.sentToAccountant ? 'Marcar como não enviado para contador' : 'Marcar como enviado para contador'}
              aria-disabled={!invoice.sentToClient}
              tabIndex={0}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-all ${
                invoice.sentToAccountant
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 cursor-pointer'
                  : !invoice.sentToClient
                  ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {invoice.sentToAccountant ? 'Contador ✓' : 'Contador'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2" role="group" aria-label="Ações da invoice">
          {invoiceFiles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleDownloadFile(invoiceFiles[0].file_key, invoiceFiles[0].original_name, e)
              }}
              aria-label="Baixar invoice"
              tabIndex={0}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(invoice.id)
            }}
            aria-label="Editar invoice"
            tabIndex={0}
          >
            <Edit className="h-4 w-4" aria-hidden="true" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deletingInvoice === invoice.id}
                onClick={(e) => e.stopPropagation()}
                aria-label="Deletar invoice"
                tabIndex={0}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
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
                  onClick={() => onDelete(invoice.id, invoice.client_name || '')}
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
}

export { InvoiceItem }
export type { FormattedInvoice, InvoiceItemProps }

