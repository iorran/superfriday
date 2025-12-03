'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { getClients, getInvoice, updateInvoice, deleteInvoiceFile } from '@/lib/client/db-client'
import { uploadFile } from '@/lib/client/storage-client'
import { createInvoice } from '@/lib/client/db-client'
import { Upload, X, FileText, Calendar, Trash2 } from 'lucide-react'

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
  const [clients, setClients] = useState<any[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([])
  const [filesToDelete, setFilesToDelete] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (editingInvoiceId) {
      loadInvoiceForEdit()
    } else {
      // Reset form when not editing
      setFiles([])
      setExistingFiles([])
      setFilesToDelete(new Set())
      setInvoiceAmount('')
      setDueDate('')
      setMonth(new Date().getMonth() + 1)
      setYear(new Date().getFullYear())
      setSelectedClientId('')
    }
  }, [editingInvoiceId])

  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId)
      setSelectedClient(client)
      
      // Reset new files if client changes and new client doesn't require timesheet
      if (client && !client.requires_timesheet) {
        setFiles(prev => prev.filter(f => f.fileType !== 'timesheet'))
      }
      
      // Note: Existing files are not automatically removed when client changes
      // User can manually remove them if needed
    }
  }, [selectedClientId, clients])

  const loadInvoiceForEdit = async () => {
    if (!editingInvoiceId) return

    try {
      setLoadingInvoice(true)
      const invoice = await getInvoice(editingInvoiceId)
      if (invoice) {
        setSelectedClientId(invoice.client_id)
        setInvoiceAmount(invoice.invoice_amount?.toString() || '')
        setDueDate(invoice.due_date || '')
        setMonth(invoice.month || new Date().getMonth() + 1)
        setYear(invoice.year || new Date().getFullYear())
        
        // Load existing files
        if (invoice.files && invoice.files.length > 0) {
          const existing = invoice.files.map((f: any) => ({
            id: f.id,
            fileKey: f.file_key,
            fileType: f.file_type,
            originalName: f.original_name,
            fileSize: f.file_size || 0,
            isExisting: true as const,
          }))
          setExistingFiles(existing)
        }
      }
    } catch (error: any) {
      console.error('Error loading invoice for edit:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar invoice para edição",
        variant: "destructive",
      })
    } finally {
      setLoadingInvoice(false)
    }
  }

  const removeExistingFile = async (fileId: string) => {
    if (!editingInvoiceId) return

    try {
      // Add to deletion list (will be deleted when saving)
      setFilesToDelete(prev => new Set(prev).add(fileId))
      
      // Remove from display immediately
      setExistingFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (error: any) {
      console.error('Error removing file:', error)
      toast({
        title: "Erro",
        description: "Falha ao remover arquivo",
        variant: "destructive",
      })
    }
  }

  const loadClients = async () => {
    try {
      const clientsList = await getClients()
      setClients(clientsList)
    } catch (error) {
      console.error('Error loading clients:', error)
      toast({
        title: "Erro",
        description: "Falha ao carregar clientes. Por favor, recarregue a página.",
        variant: "destructive",
      })
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedClientId) {
      toast({
        title: "Cliente Necessário",
        description: "Por favor, selecione um cliente antes de fazer upload dos arquivos.",
        variant: "destructive",
      })
      return
    }

    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      fileType: file.name.toLowerCase().includes('timesheet') || file.name.toLowerCase().includes('timesheet') 
        ? 'timesheet' as const
        : 'invoice' as const,
      progress: 0,
      uploaded: false,
    }))

    setFiles(prev => [...prev, ...newFiles])
  }, [selectedClientId, toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading || isCreatingInvoice || !selectedClientId,
    multiple: true,
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const setFileType = (index: number, fileType: 'invoice' | 'timesheet') => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, fileType } : f
    ))
  }

  const handleUpload = async () => {
    // Validation: must have client, amount, and due date
    // For new invoices, must have files. For editing, can have existing files or new files
    const hasAnyFiles = files.length > 0 || (isEditing && existingFiles.length > filesToDelete.size)
    
    if (!selectedClientId || (!isEditing && files.length === 0) || !invoiceAmount || !dueDate) {
      toast({
        title: "Erro de Validação",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    if (editingInvoiceId) {
      // Update existing invoice
      try {
        setIsCreatingInvoice(true)

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
              deleteInvoiceFile(editingInvoiceId, fileId).catch(err => {
                console.warn('Error deleting file:', err)
                // Continue even if some deletions fail
              })
            )
          )
        }

        // Update invoice
        await updateInvoice(editingInvoiceId, {
          clientId: selectedClientId,
          invoiceAmount: parseFloat(invoiceAmount),
          dueDate,
          month,
          year,
          newFiles: uploadedNewFiles,
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
      } catch (error: any) {
        console.error('Update error:', error)
        toast({
          title: "Erro na Atualização",
          description: error.message || "Falha ao atualizar invoice",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
        setIsCreatingInvoice(false)
      }
    } else {
      // Create new invoice
      if (files.length === 0) {
        toast({
          title: "Arquivos Necessários",
          description: "Por favor, adicione pelo menos um arquivo.",
          variant: "destructive",
        })
        return
      }

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
        setIsCreatingInvoice(true)

        // Create invoice
        await createInvoice({
          clientId: selectedClientId,
          invoiceAmount: parseFloat(invoiceAmount),
          dueDate,
          month,
          year,
          files: uploadedFiles,
        })

        toast({
          title: "Sucesso!",
          description: "Invoice criada com sucesso!",
          variant: "default",
        })

        // Reset form
        setFiles([])
        setInvoiceAmount('')
        setDueDate('')

        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } catch (error: any) {
        console.error('Upload error:', error)
        toast({
          title: "Erro no Upload",
          description: error.message || "Falha ao fazer upload dos arquivos",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
        setIsCreatingInvoice(false)
      }
    }
  }

  const isEditing = !!editingInvoiceId
  const hasFiles = files.length > 0 || (isEditing && existingFiles.length > filesToDelete.size)
  const canUpload = selectedClientId && (isEditing || files.length > 0) && invoiceAmount && dueDate
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
            <>
              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <select
                  id="client"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                  disabled={isUploading || isCreatingInvoice || clients.length === 0}
                  required
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
            {selectedClient && (
              <p className="text-sm text-muted-foreground">
                Email: {selectedClient.email}
                {selectedClient.accountant_email && ` • Contador: ${selectedClient.accountant_email}`}
              </p>
            )}
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor da Invoice *</Label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 border rounded-md bg-background"
                disabled={isUploading || isCreatingInvoice}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento *</Label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
                disabled={isUploading || isCreatingInvoice}
                required
              />
            </div>
          </div>

          {/* Month/Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mês</Label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full p-2 border rounded-md bg-background"
                disabled={isUploading || isCreatingInvoice}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full p-2 border rounded-md bg-background"
                disabled={isUploading || isCreatingInvoice}
                min="2020"
                max="2100"
              />
            </div>
          </div>
            </>
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
          isUploading || isCreatingInvoice || !selectedClientId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${
          isDragActive 
            ? 'border-blue-500 border-2 bg-blue-50 dark:bg-blue-950' 
            : 'border-dashed border-2 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900'
        }`}
      >
        <CardContent className="p-8">
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            {!selectedClientId ? (
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
            onClick={handleUpload}
            disabled={!canUpload || isUploading || isCreatingInvoice}
            size="lg"
          >
            {isUploading ? 'Fazendo Upload...' : isCreatingInvoice ? (isEditing ? 'Atualizando Invoice...' : 'Criando Invoice...') : (isEditing ? 'Atualizar Invoice' : 'Criar Invoice')}
          </Button>
        </div>
      )}
    </div>
  )
}
