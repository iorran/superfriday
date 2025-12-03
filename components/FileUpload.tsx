'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { useStore } from '@tanstack/react-store'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { uploadFile } from '@/lib/client/storage-client'
import { useClients } from '@/lib/hooks/use-clients'
import { useInvoice, useCreateInvoice, useUpdateInvoice, useDeleteInvoiceFile } from '@/lib/hooks/use-invoices'
import { Upload, X, FileText, Trash2 } from 'lucide-react'
import type { Client, InvoiceFile } from '@/types'
import { invoiceSchema, type InvoiceFormData } from '@/lib/validations'

interface FileUploadProps {
  onUploadSuccess?: () => void
  editingInvoiceId?: string | null
  onCancel?: () => void
}

interface UploadedFile {
  file: File
  fileKey?: string
  fileType: 'invoice' | 'timesheet'
  progress: number
  uploaded: boolean
}

interface ExistingFile {
  id: string
  fileKey: string
  fileType: 'invoice' | 'timesheet'
  originalName: string
  fileSize: number
  isExisting: true
}

export default function FileUpload({ onUploadSuccess, editingInvoiceId, onCancel }: FileUploadProps) {
  const { data: clients = [] } = useClients()
  const { data: invoiceData, isLoading: loadingInvoice } = useInvoice(editingInvoiceId)
  const createInvoiceMutation = useCreateInvoice()
  const updateInvoiceMutation = useUpdateInvoice()
  const deleteInvoiceFileMutation = useDeleteInvoiceFile()
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([])
  const [filesToDelete, setFilesToDelete] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()
  
  const isCreatingInvoice = createInvoiceMutation.isPending

  const form = useForm({
    defaultValues: {
      clientId: '',
      invoiceAmount: 0,
      dueDate: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    },
    onSubmit: async ({ value }: { value: InvoiceFormData }) => {
      // Validate with Zod schema
      const result = invoiceSchema.safeParse(value)
      if (!result.success) {
        toast({
          title: "Erro de Validação",
          description: result.error.errors[0]?.message || "Por favor, verifique os campos",
          variant: "destructive",
        })
        return
      }
      await handleUpload(value)
    },
  })

  // Load invoice data when editing
  useEffect(() => {
    if (invoiceData) {
      form.setFieldValue('clientId', invoiceData.client_id)
      form.setFieldValue('invoiceAmount', invoiceData.invoice_amount || 0)
      form.setFieldValue('dueDate', invoiceData.due_date || '')
      form.setFieldValue('month', invoiceData.month || new Date().getMonth() + 1)
      form.setFieldValue('year', invoiceData.year || new Date().getFullYear())
      
      // Load existing files
      if (invoiceData.files && invoiceData.files.length > 0) {
        const existing = invoiceData.files.map((f: InvoiceFile) => ({
          id: f.id,
          fileKey: f.file_key,
          fileType: f.file_type,
          originalName: f.original_name,
          fileSize: f.file_size || 0,
          isExisting: true as const,
        }))
        setExistingFiles(existing)
        setFilesToDelete(new Set())
      }
    } else if (!editingInvoiceId) {
      // Reset form when not editing
      setFiles([])
      setExistingFiles([])
      setFilesToDelete(new Set())
      form.reset()
    }
  }, [invoiceData, editingInvoiceId, form])

  // Subscribe to clientId changes from form
  const clientId = useStore(form.store, (state) => state.values.clientId || '')
  
  useEffect(() => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId)
      setSelectedClient(client || null)
      
      // Reset new files if client changes and new client doesn't require timesheet
      if (client && !client.requires_timesheet) {
        setFiles(prev => prev.filter(f => f.fileType !== 'timesheet'))
      }
      
      // Note: Existing files are not automatically removed when client changes
      // User can manually remove them if needed
    } else {
      setSelectedClient(null)
    }
  }, [clientId, clients])

  const removeExistingFile = async (fileId: string) => {
    if (!editingInvoiceId) return

    try {
      // Add to deletion list (will be deleted when saving)
      setFilesToDelete(prev => new Set(prev).add(fileId))
      
      // Remove from display immediately
      setExistingFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (error: unknown) {
      console.error('Error removing file:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao remover arquivo",
        variant: "destructive",
      })
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!clientId) {
      toast({
        title: "Cliente Necessário",
        description: "Por favor, selecione um cliente antes de fazer upload dos arquivos.",
        variant: "destructive",
      })
      return
    }

    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      fileType: (file.name || '').toLowerCase().includes('timesheet')
        ? 'timesheet' as const
        : 'invoice' as const,
      progress: 0,
      uploaded: false,
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [clientId, toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading || isCreatingInvoice || !clientId,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB in bytes
    onDropRejected: (fileRejections) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          if (error.code === 'file-too-large') {
            toast({
              title: "Arquivo muito grande",
              description: `${file.name} excede o tamanho máximo de 10MB`,
              variant: "destructive",
            })
          } else {
            toast({
              title: "Erro no arquivo",
              description: `${file.name}: ${error.message}`,
              variant: "destructive",
            })
          }
        })
      })
    },
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const setFileType = (index: number, fileType: 'invoice' | 'timesheet') => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, fileType } : f
    ))
  }

  const handleUpload = async (value: InvoiceFormData) => {
    // Validation: For new invoices, must have files. For editing, can have existing files or new files
    if (!isEditing && files.length === 0) {
      toast({
        title: "Arquivos Necessários",
        description: "Por favor, adicione pelo menos um arquivo.",
        variant: "destructive",
      })
      return
    }

    if (editingInvoiceId) {
      // Update existing invoice
      try {

        // Upload new files if any
        let uploadedNewFiles: Array<{
          fileKey: string
          fileType: 'invoice' | 'timesheet'
          originalName: string
          fileSize: number
        }> = []

        if (files.length > 0) {
          setIsUploading(true)
          uploadedNewFiles = await Promise.all(
            files.map(async (fileData, index) => {
              setFiles(prev => prev.map((f, i) => 
                i === index ? { ...f, progress: 50 } : f
              ))

              const result = await uploadFile(fileData.file)

              setFiles(prev => prev.map((f, i) => 
                i === index ? { ...f, progress: 100, uploaded: true, fileKey: result.fileKey } : f
              ))

              return {
                fileKey: result.fileKey,
                fileType: fileData.fileType,
                originalName: result.fileName,
                fileSize: result.fileSize,
              }
            })
          )
          setIsUploading(false)
        }

        // Delete files marked for deletion
        if (filesToDelete.size > 0) {
          await Promise.all(
            Array.from(filesToDelete).map(fileId => 
              deleteInvoiceFileMutation.mutateAsync({ invoiceId: editingInvoiceId, fileId }).catch(err => {
                console.warn('Error deleting file:', err)
                // Continue even if some deletions fail
              })
            )
          )
        }

        // Update invoice
        await updateInvoiceMutation.mutateAsync({
          invoiceId: editingInvoiceId,
          updates: {
            clientId: value.clientId,
            invoiceAmount: value.invoiceAmount,
            dueDate: value.dueDate,
            month: value.month,
            year: value.year,
            newFiles: uploadedNewFiles,
          },
        })

        toast({
          title: "Sucesso",
          description: "Invoice atualizada com sucesso!",
          variant: "default",
        })

        if (onUploadSuccess) {
          onUploadSuccess()
        }
        if (onCancel) {
          onCancel()
        }
      } catch (error: unknown) {
        console.error('Update error:', error)
        toast({
          title: "Erro na Atualização",
          description: error instanceof Error ? error.message : "Falha ao atualizar invoice",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    } else {
      // Create new invoice
      // Validate: must have at least one invoice file
      const hasInvoice = files.some(f => f.fileType === 'invoice')
      if (!hasInvoice) {
        toast({
          title: "Invoice Necessário",
          description: "É necessário pelo menos um arquivo de invoice.",
          variant: "destructive",
        })
        return
      }

      // Validate: if client requires timesheet, must have timesheet file
      if (selectedClient?.requires_timesheet) {
        const hasTimesheet = files.some(f => f.fileType === 'timesheet')
        if (!hasTimesheet) {
          toast({
            title: "Timesheet Necessário",
            description: `${selectedClient.name} requer um arquivo de timesheet.`,
            variant: "destructive",
          })
          return
        }
      }

      setIsUploading(true)

      try {
        // Upload all files
        const uploadedFiles = await Promise.all(
          files.map(async (fileData, index) => {
            setFiles(prev => prev.map((f, i) => 
              i === index ? { ...f, progress: 50 } : f
            ))

            const result = await uploadFile(fileData.file)

            setFiles(prev => prev.map((f, i) => 
              i === index ? { ...f, progress: 100, uploaded: true, fileKey: result.fileKey } : f
            ))

            return {
              fileKey: result.fileKey,
              fileType: fileData.fileType,
              originalName: result.fileName,
              fileSize: result.fileSize,
            }
          })
        )

        setIsUploading(false)

        // Create invoice
        await createInvoiceMutation.mutateAsync({
          clientId: value.clientId,
          invoiceAmount: value.invoiceAmount,
          dueDate: value.dueDate,
          month: value.month,
          year: value.year,
          files: uploadedFiles,
        })

        toast({
          title: "Sucesso!",
          description: "Invoice criada com sucesso!",
          variant: "default",
        })

        // Reset form
        setFiles([])
        form.reset()

        if (onUploadSuccess) {
          onUploadSuccess()
        }
    } catch (error: unknown) {
      console.error('Upload error:', error)
      toast({
        title: "Erro no Upload",
        description: error instanceof Error ? error.message : "Falha ao fazer upload dos arquivos",
        variant: "destructive",
      })
      } finally {
        setIsUploading(false)
      }
    }
  }

  const isEditing = !!editingInvoiceId
  const hasFiles = files.length > 0 || (isEditing && existingFiles.length > filesToDelete.size)
  const invoiceAmount = form.state.values.invoiceAmount
  const dueDate = form.state.values.dueDate
  const canUpload = clientId && (isEditing || files.length > 0) && invoiceAmount && dueDate
  const requiresTimesheet = selectedClient?.requires_timesheet

  return (
    <div className="flex flex-col gap-6 w-full">
      
      <Card className="w-full">
        <CardContent className="p-6 space-y-4">
          {loadingInvoice ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando invoice...
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
            >
              {/* Client Selection */}
              <form.Field
                name="clientId"
                validators={{
                  onChange: ({ value }): string | undefined => {
                    // Only validate if there's a value (allow empty for initial state)
                    if (!value || value === '') {
                      return undefined
                    }
                    const result = invoiceSchema.shape.clientId.safeParse(value)
                    if (!result.success) {
                      return result.error.errors[0]?.message || 'Valor inválido'
                    }
                    return undefined
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Cliente *</Label>
                    <select
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value)
                      }}
                      className="w-full p-2 border rounded-md bg-background"
                      disabled={isUploading || isCreatingInvoice || clients.length === 0}
                    >
                      {clients.length === 0 ? (
                        <option value="">Nenhum cliente disponível - Crie um cliente primeiro</option>
                      ) : (
                        <>
                          <option value="">Selecione um cliente...</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}{(client.requires_timesheet === 1 || client.requires_timesheet === true) ? ' (requer timesheet)' : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {String(field.state.meta.errors[0])}
                      </p>
                    )}
                    {selectedClient && (
                      <p className="text-sm text-muted-foreground">
                        Email: {selectedClient.email}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <form.Field
                  name="invoiceAmount"
                  validators={{
                    onChange: ({ value }): string | undefined => {
                      const result = invoiceSchema.shape.invoiceAmount.safeParse(value)
                      if (!result.success) {
                        return result.error.errors[0]?.message || 'Valor inválido'
                      }
                      return undefined
                    },
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Valor da Invoice *</Label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="number"
                        step="0.01"
                        value={field.state.value || ''}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value ? parseFloat(e.target.value) : 0)}
                        placeholder="0.00"
                        className="w-full p-2 border rounded-md bg-background"
                        disabled={isUploading || isCreatingInvoice}
                      />
                      {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {String(field.state.meta.errors[0])}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
                <form.Field
                  name="dueDate"
                  validators={{
                    onChange: ({ value }): string | undefined => {
                      const result = invoiceSchema.shape.dueDate.safeParse(value)
                      if (!result.success) {
                        return result.error.errors[0]?.message || 'Valor inválido'
                      }
                      return undefined
                    },
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Data de Vencimento *</Label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="date"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background"
                        disabled={isUploading || isCreatingInvoice}
                      />
                      {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {String(field.state.meta.errors[0])}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Month/Year */}
              <div className="grid grid-cols-2 gap-4">
                <form.Field
                  name="month"
                  validators={{
                    onChange: ({ value }): string | undefined => {
                      const result = invoiceSchema.shape.month.safeParse(value)
                      if (!result.success) {
                        return result.error.errors[0]?.message || 'Valor inválido'
                      }
                      return undefined
                    },
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Mês</Label>
                      <select
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(parseInt(e.target.value))}
                        className="w-full p-2 border rounded-md bg-background"
                        disabled={isUploading || isCreatingInvoice}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {String(field.state.meta.errors[0])}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
                <form.Field
                  name="year"
                  validators={{
                    onChange: ({ value }): string | undefined => {
                      const result = invoiceSchema.shape.year.safeParse(value)
                      if (!result.success) {
                        return result.error.errors[0]?.message || 'Valor inválido'
                      }
                      return undefined
                    },
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Ano</Label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="number"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(parseInt(e.target.value))}
                        className="w-full p-2 border rounded-md bg-background"
                        disabled={isUploading || isCreatingInvoice}
                        min="2020"
                        max="2100"
                      />
                      {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {String(field.state.meta.errors[0])}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Existing Files List */}
      {isEditing && existingFiles.length > 0 && (
        <Card className="w-full">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Arquivos Existentes</h3>
            <div className="space-y-3">
              {existingFiles.map((fileData) => (
                <div
                  key={fileData.id}
                  className="flex items-center gap-3 p-3 border rounded-md bg-card"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{fileData.originalName}</p>
                    <p className="text-sm text-muted-foreground">
                      {fileData.fileSize > 0 ? `${(fileData.fileSize / 1024).toFixed(2)} KB` : 'Tamanho desconhecido'} • {fileData.fileType === 'invoice' ? 'Invoice' : 'Timesheet'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExistingFile(fileData.id)}
                      disabled={isUploading || isCreatingInvoice}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Area */}
      <Card
        {...getRootProps()}
        className={`w-full transition-all ${
          isUploading || isCreatingInvoice || !clientId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${
          isDragActive 
            ? 'border-blue-500 border-2 bg-blue-50 dark:bg-blue-950' 
            : 'border-dashed border-2 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900'
        }`}
      >
        <CardContent className="p-8">
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            {!clientId ? (
              <>
                <p className="text-xl font-bold text-muted-foreground">
                  Selecione um cliente primeiro
                </p>
                <p className="text-sm text-muted-foreground">
                  Você precisa selecionar um cliente antes de fazer upload dos arquivos
                </p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <p className="text-xl font-bold">
                  {isDragActive ? 'Solte os arquivos aqui' : 'Arraste e solte os arquivos aqui'}
                </p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar arquivos
                </p>
                {(requiresTimesheet === true || requiresTimesheet === 1) ? (
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-2">
                    ⚠️ Este cliente requer: Invoice + Timesheet
                  </p>
                ) : null}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Uploaded Files List */}
      {files.length > 0 && (
        <Card className="w-full">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Arquivos Adicionados</h3>
            <div className="space-y-3">
              {files.map((fileData, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-md bg-card"
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{fileData.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(fileData.file.size / 1024).toFixed(2)} KB
                    </p>
                    {fileData.progress > 0 && fileData.progress < 100 && (
                      <Progress value={fileData.progress} className="mt-2" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={fileData.fileType}
                      onChange={(e) => setFileType(index, e.target.value as 'invoice' | 'timesheet')}
                      className="text-sm p-1 border rounded bg-background"
                      disabled={isUploading || isCreatingInvoice || fileData.uploaded}
                    >
                      <option value="invoice">Invoice</option>
                      {(requiresTimesheet === true || requiresTimesheet === 1) && <option value="timesheet">Timesheet</option>}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading || isCreatingInvoice || fileData.uploaded}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload/Update Button */}
      {(hasFiles || isEditing) && (
        <div className="flex justify-end gap-2 w-full">
          {isEditing && onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isUploading || isCreatingInvoice}
              size="lg"
            >
              Cancelar
            </Button>
          )}
          <Button
            onClick={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            disabled={!canUpload || isUploading || isCreatingInvoice}
            size="lg"
            type="button"
          >
            {isUploading ? 'Fazendo Upload...' : isCreatingInvoice ? (isEditing ? 'Atualizando Invoice...' : 'Criando Invoice...') : (isEditing ? 'Atualizar Invoice' : 'Criar Invoice')}
          </Button>
        </div>
      )}
    </div>
  )
}
