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
  deleteInvoice
} from '@/lib/client/db-client'
import { FileText, Calendar, Trash2, Mail, User } from 'lucide-react'

interface FileListProps {
  refreshTrigger?: number
}

export default function FileList({ refreshTrigger }: FileListProps) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
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
      
      // Parse and format invoices
      const formattedInvoices = invoicesList.map((inv: any) => {
        const timestamp = parseInt(inv.file_key.split('-')[0])
        const date = isNaN(timestamp) ? new Date(inv.uploaded_at) : new Date(timestamp)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' })

        return {
          ...inv,
          lastModified: date,
          monthKey,
          monthName,
          sentToClient: inv.sent_to_client === 1 || inv.sent_to_client === true,
          sentToAccountManager: inv.sent_to_account_manager === 1 || inv.sent_to_account_manager === true,
        }
      })

      setInvoices(formattedInvoices)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

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

  const handleStateChange = useCallback(async (fileKey: string, stateName: string, value: boolean) => {
    try {
      const updates: any = { [stateName]: value }
      await updateInvoiceState(fileKey, updates)
      
      // Update local state
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.file_key === fileKey
            ? { ...inv, [stateName]: value }
            : inv
        )
      )

      const stateLabels: Record<string, string> = {
        sentToClient: 'Sent to Client',
        sentToAccountManager: 'Sent to Account Manager',
      }

      toast({
        title: "State Updated",
        description: `${stateLabels[stateName]} ${value ? 'marked' : 'unmarked'}`,
        variant: "default",
      })
    } catch (error: any) {
      console.error('Error updating invoice state:', error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update invoice state",
        variant: "destructive",
      })
    }
  }, [toast])

  const handleDelete = useCallback(async (fileKey: string, fileName: string) => {
    try {
      setDeletingFile(fileKey)
      
      // Delete from storage via API
      const response = await fetch(`/api/files/${fileKey}`, {
        method: 'DELETE',
      })

      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to delete file from storage')
      }

      // Delete from database
      await deleteInvoice(fileKey)

      toast({
        title: "File Deleted",
        description: `"${fileName}" has been deleted successfully`,
        variant: "default",
      })

      // Remove from local state
      setInvoices((prev) => prev.filter((inv) => inv.file_key !== fileKey))
    } catch (error: any) {
      console.error('Error deleting file:', error)
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      })
    } finally {
      setDeletingFile(null)
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
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading invoices...</p>
        </CardContent>
      </Card>
    )
  }

  if (invoices.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No invoices uploaded yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {Object.entries(invoicesByMonth).map(([monthKey, group]) => {
        const isExpanded = expandedMonths.has(monthKey)
        return (
          <Card key={monthKey}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleMonth(monthKey)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-semibold">{group.monthName}</span>
                  <span className="text-sm text-muted-foreground">
                    ({group.invoices.length} {group.invoices.length === 1 ? 'invoice' : 'invoices'})
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent open={isExpanded}>
                <div className="p-4 space-y-2">
                  {group.invoices.map((invoice) => (
                    <div
                      key={invoice.file_key}
                      className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{invoice.original_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.client_name || 'No client'} • {formatDate(invoice.lastModified)} • {formatFileSize(invoice.file_size)}
                          </p>
                          {/* Invoice States */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStateChange(invoice.file_key, 'sentToClient', !invoice.sentToClient)
                              }}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                                invoice.sentToClient
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              <Mail className="h-3 w-3" />
                              Sent to Client
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStateChange(invoice.file_key, 'sentToAccountManager', !invoice.sentToAccountManager)
                              }}
                              disabled={!invoice.sentToClient}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                                invoice.sentToAccountManager
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                  : invoice.sentToClient
                                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed opacity-50'
                              }`}
                            >
                              <User className="h-3 w-3" />
                              Sent to Account Manager
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={deletingFile === invoice.file_key}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the invoice
                                <strong className="block mt-2">"{invoice.original_name}"</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(invoice.file_key, invoice.original_name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deletingFile === invoice.file_key}
                              >
                                {deletingFile === invoice.file_key ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}
    </div>
  )
}

