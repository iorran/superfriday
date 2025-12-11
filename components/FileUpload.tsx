'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { useStore } from '@tanstack/react-store'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Stepper, StepContent } from '@/components/ui/stepper'
import { InvoiceSummary } from '@/components/InvoiceSummary'
import { uploadFile } from '@/lib/client/storage-client'
import { useClients } from '@/lib/hooks/use-clients'
import { useInvoice, useCreateInvoice, useUpdateInvoice, useDeleteInvoiceFile } from '@/lib/hooks/use-invoices'
import { usePDFExtraction } from '@/lib/hooks/use-pdf-extraction'
import { Upload, X, FileText, Trash2, Loader2, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react'
import type { Client, InvoiceFile, ExtractedPDFData } from '@/types'
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

const STEPS = [
  { id: 1, label: 'Upload PDF', description: 'Anexe o arquivo PDF' },
  { id: 2, label: 'Revisar Dados', description: 'Confirme e edite' },
  { id: 3, label: 'Confirmar', description: 'Criar invoice' },
]

export default function FileUpload({ onUploadSuccess, editingInvoiceId, onCancel }: FileUploadProps) {
  const { data: clients = [] } = useClients()
  const { data: invoiceData, isLoading: loadingInvoice } = useInvoice(editingInvoiceId)
  const createInvoiceMutation = useCreateInvoice()
  const updateInvoiceMutation = useUpdateInvoice()
  const deleteInvoiceFileMutation = useDeleteInvoiceFile()
  const { extractFromFile, isExtracting } = usePDFExtraction()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isNewClient, setIsNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState<string>('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([])
  const [filesToDelete, setFilesToDelete] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedPDFData | null>(null)
  const { toast } = useToast()
  
  const isCreatingInvoice = createInvoiceMutation.isPending
  const isEditing = !!editingInvoiceId

  const form = useForm({
    defaultValues: {
      clientId: '',
      invoiceAmount: 0,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    },
    onSubmit: async ({ value }: { value: InvoiceFormData }) => {
      if (currentStep < 3) {
        // Validate current step before proceeding
        if (currentStep === 1) {
          if (files.length === 0) {
            toast({
              title: "Arquivo Necessário",
              description: "Por favor, anexe um arquivo PDF.",
              variant: "destructive",
            })
            return
          }
          handleNextStep()
        } else if (currentStep === 2) {
          const result = invoiceSchema.safeParse(value)
          if (!result.success) {
            toast({
              title: "Erro de Validação",
              description: result.error.errors[0]?.message || "Por favor, verifique os campos",
              variant: "destructive",
            })
            return
          }
          handleNextStep()
        }
      } else {
        // Step 3: Final submission
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
      }
    },
  })


  // Load invoice data when editing
  useEffect(() => {
    if (invoiceData) {
      form.setFieldValue('clientId', invoiceData.client_id)
      form.setFieldValue('invoiceAmount', invoiceData.invoice_amount || 0)
      form.setFieldValue('month', invoiceData.month || new Date().getMonth() + 1)
      form.setFieldValue('year', invoiceData.year || new Date().getFullYear())
      
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
      setFiles([])
      setExistingFiles([])
      setFilesToDelete(new Set())
      setExtractedData(null)
      setCurrentStep(1)
      form.reset()
    }
  }, [invoiceData, editingInvoiceId, form])

  // Subscribe to clientId changes from form
  const clientId = useStore(form.store, (state) => state.values.clientId || '')
  
  useEffect(() => {
    if (clientId && !clientId.startsWith('__new__')) {
      const client = clients.find(c => c.id === clientId)
      setSelectedClient(client || null)
      
      if (client && !client.requires_timesheet) {
        setFiles(prev => prev.filter(f => f.fileType !== 'timesheet'))
      }
    } else {
      setSelectedClient(null)
      if (clientId && clientId.startsWith('__new__')) {
        setIsNewClient(true)
        setNewClientName(clientId.replace('__new__', ''))
      } else {
        setIsNewClient(false)
        setNewClientName('')
      }
    }
  }, [clientId, clients])


  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Only accept PDF files for step 1
    if (currentStep === 1) {
      const pdfFile = acceptedFiles.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
      
      if (!pdfFile) {
        toast({
          title: "Arquivo Inválido",
          description: "Por favor, selecione um arquivo PDF.",
          variant: "destructive",
        })
        return
      }

      // Extract data from PDF (this may fail silently if pdf-parse is not available)
      const extracted = await extractFromFile(pdfFile)
      
      // Upload PDF file regardless of extraction success
      setIsUploading(true)
      try {
        const result = await uploadFile(pdfFile)
        setFiles([{
          file: pdfFile,
          fileKey: result.fileKey,
          fileType: 'invoice',
          progress: 100,
          uploaded: true,
        }])
        
        // If extraction succeeded, pre-fill form and show success message
        if (extracted) {
          setExtractedData(extracted)
          
          // Pre-fill form with extracted data
          if (extracted.amount) {
            form.setFieldValue('invoiceAmount', extracted.amount)
          }
          if (extracted.month) {
            form.setFieldValue('month', extracted.month)
          }
          if (extracted.year) {
            form.setFieldValue('year', extracted.year)
          }
          
          // Auto-select or create client if name was extracted
          if (extracted.clientName) {
            const existingClient = clients.find(c => 
              c.name.toLowerCase().trim() === extracted.clientName!.toLowerCase().trim()
            )
            
            if (existingClient) {
              // Client exists, select it
              form.setFieldValue('clientId', existingClient.id)
              setIsNewClient(false)
              setNewClientName('')
            } else {
              // Client doesn't exist, prepare to create it
              setIsNewClient(true)
              setNewClientName(extracted.clientName)
              form.setFieldValue('clientId', `__new__${extracted.clientName}`)
            }
          }
          
          toast({
            title: "PDF Processado",
            description: extracted.confidence === 'high' 
              ? "Dados extraídos com sucesso!" 
              : extracted.confidence === 'medium'
              ? "PDF processado. Alguns dados foram extraídos - verifique e ajuste se necessário."
              : "PDF enviado. Preencha os dados manualmente.",
            variant: "default",
          })
        } else {
          // Extraction failed or not available, but file uploaded successfully
          toast({
            title: "PDF Enviado",
            description: "Arquivo enviado com sucesso. Preencha os dados do formulário.",
            variant: "default",
          })
        }
      } catch (err) {
        toast({
          title: "Erro no Upload",
          description: err instanceof Error ? err.message : "Falha ao fazer upload do PDF",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    } else {
      // For step 2, allow adding timesheet files
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
    }
  }, [currentStep, clientId, toast, extractFromFile, form])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading || isCreatingInvoice || (currentStep === 1 && files.length > 0),
    multiple: currentStep !== 1,
    accept: currentStep === 1 ? { 'application/pdf': ['.pdf'] } : undefined,
    maxSize: 10 * 1024 * 1024,
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

  const removeExistingFile = async (fileId: string) => {
    if (!editingInvoiceId) return

    try {
      setFilesToDelete(prev => new Set(prev).add(fileId))
      setExistingFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (error: unknown) {
      console.error('Error removing existing file:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao remover arquivo",
        variant: "destructive",
      })
    }
  }

  const handleUpload = async (value: InvoiceFormData) => {
    if (!isEditing && files.length === 0) {
      toast({
        title: "Arquivos Necessários",
        description: "Por favor, adicione pelo menos um arquivo.",
        variant: "destructive",
      })
      return
    }

    if (editingInvoiceId) {
      // Update existing invoice (keep old flow for editing)
      try {
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
              if (fileData.fileKey) {
                return {
                  fileKey: fileData.fileKey,
                  fileType: fileData.fileType,
                  originalName: fileData.file.name,
                  fileSize: fileData.file.size,
                }
              }

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

        if (filesToDelete.size > 0) {
          await Promise.all(
            Array.from(filesToDelete).map(fileId => 
              deleteInvoiceFileMutation.mutateAsync({ invoiceId: editingInvoiceId, fileId }).catch(err => {
                console.warn('Error deleting file:', err)
              })
            )
          )
        }

        await updateInvoiceMutation.mutateAsync({
          invoiceId: editingInvoiceId,
          updates: {
            clientId: value.clientId,
            invoiceAmount: value.invoiceAmount,
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
      const hasInvoice = files.some(f => f.fileType === 'invoice')
      if (!hasInvoice) {
        toast({
          title: "Invoice Necessário",
          description: "É necessário pelo menos um arquivo de invoice.",
          variant: "destructive",
        })
        return
      }

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
        // Process new files (upload if needed)
        const uploadedFiles = await Promise.all(
          files.map(async (fileData) => {
            if (fileData.fileKey) {
              return {
                fileKey: fileData.fileKey,
                fileType: fileData.fileType,
                originalName: fileData.file.name,
                fileSize: fileData.file.size,
              }
            }

            const result = await uploadFile(fileData.file)

            return {
              fileKey: result.fileKey,
              fileType: fileData.fileType,
              originalName: result.fileName,
              fileSize: result.fileSize,
            }
          })
        )

        setIsUploading(false)

        // Determine clientId and clientName
        let finalClientId = value.clientId
        let finalClientName: string | undefined = undefined
        
        // Use extracted client name if available, otherwise use manually entered name
        if (isNewClient) {
          const nameToUse = extractedData?.clientName || newClientName.trim()
          if (nameToUse) {
            // Creating new client - use a temporary ID, will be replaced by server
            finalClientId = `__new__${nameToUse}`
            finalClientName = nameToUse
          }
        } else {
          // If client exists but we have extracted name, use it as fallback
          // (in case clientId doesn't match any existing client)
          if (extractedData?.clientName && !clients.find(c => c.id === value.clientId)) {
            finalClientName = extractedData.clientName
          }
        }

        await createInvoiceMutation.mutateAsync({
          clientId: finalClientId,
          clientName: finalClientName,
          invoiceAmount: value.invoiceAmount,
          month: value.month,
          year: value.year,
          files: uploadedFiles,
        })

        // Show warning if new client was created without email
        const createdClientName = finalClientName || newClientName.trim()
        if (isNewClient && createdClientName) {
          toast({
            title: "Invoice Criada!",
            description: `Cliente "${createdClientName}" foi criado automaticamente sem email. Adicione o email na lista de invoices.`,
            variant: "default",
          })
        } else {
          toast({
            title: "Sucesso!",
            description: "Invoice criada com sucesso!",
            variant: "default",
          })
        }

        setFiles([])
        setExtractedData(null)
        setCurrentStep(1)
        form.reset()

        if (onUploadSuccess) {
          onUploadSuccess()
        }
      } catch (error: unknown) {
        console.error('Upload error:', error)
        toast({
          title: "Erro no Upload",
          description: error instanceof Error ? error.message : "Falha ao criar invoice",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    }
  }

  const hasFiles = files.length > 0 || (isEditing && existingFiles.length > filesToDelete.size)
  const invoiceAmount = form.state.values.invoiceAmount
  const canProceed = clientId && (isEditing || files.length > 0) && invoiceAmount
  const requiresTimesheet = selectedClient?.requires_timesheet

  // For editing mode, use old layout (no steppers)
  if (isEditing) {
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
                <form.Field name="clientId">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Cliente *</Label>
                      <select
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background"
                        disabled={isUploading || isCreatingInvoice || clients.length === 0}
                      >
                        {clients.length === 0 ? (
                          <option value="">Nenhum cliente disponível</option>
                        ) : (
                          <>
                            <option value="">Selecione um cliente...</option>
                            {clients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  )}
                </form.Field>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="invoiceAmount">
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
                      </div>
                    )}
                  </form.Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="month">
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
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="year">
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
                      </div>
                    )}
                  </form.Field>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {existingFiles.length > 0 && (
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
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card {...getRootProps()} className={`w-full transition-all ${isUploading || isCreatingInvoice || !clientId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isDragActive ? 'border-blue-500 border-2 bg-blue-50 dark:bg-blue-950' : 'border-dashed border-2 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900'}`}>
          <CardContent className="p-8">
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <p className="text-xl font-bold">
                {isDragActive ? 'Solte os arquivos aqui' : 'Arraste e solte os arquivos aqui'}
              </p>
            </div>
          </CardContent>
        </Card>

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

        {hasFiles && (
          <div className="flex justify-end gap-2 w-full">
            {onCancel && (
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
              disabled={!canProceed || isUploading || isCreatingInvoice}
              size="lg"
              type="button"
            >
              {isUploading ? 'Fazendo Upload...' : isCreatingInvoice ? 'Atualizando Invoice...' : 'Atualizar Invoice'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // New invoice creation flow with steppers
  return (
    <div className="flex flex-col gap-6 w-full">
      <Stepper
        steps={STEPS}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        className="mb-6"
      />

      {/* Step 1: Upload PDF */}
      <StepContent step={1} currentStep={currentStep}>
        <Card className="w-full">
          <CardContent className="p-6 space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Anexe o PDF da Invoice</h2>
              <p className="text-muted-foreground">
                Faça upload do arquivo PDF. Os dados serão extraídos automaticamente.
              </p>
            </div>

            {files.length === 0 ? (
              <Card
                {...getRootProps()}
                className={`w-full transition-all ${
                  isUploading || isExtracting ? 'cursor-wait opacity-60' : 'cursor-pointer'
                } ${
                  isDragActive 
                    ? 'border-primary border-2 bg-primary/5' 
                    : 'border-dashed border-2 hover:border-primary hover:bg-muted/50'
                }`}
              >
                <CardContent className="p-12">
                  <input {...getInputProps()} />
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    {isExtracting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="h-12 w-12 text-primary" />
                        </motion.div>
                        <p className="text-lg font-semibold">Processando PDF...</p>
                        <p className="text-sm text-muted-foreground">Extraindo dados do arquivo</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-16 w-16 text-muted-foreground" />
                        <div>
                          <p className="text-xl font-bold">
                            {isDragActive ? 'Solte o PDF aqui' : 'Arraste e solte o PDF aqui'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            ou clique para selecionar arquivo
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Apenas arquivos PDF (máx. 10MB)
                        </p>
                      </>
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {files.map((fileData, index) => (
                  <Card key={index} className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{fileData.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(fileData.file.size / 1024).toFixed(2)} KB
                          </p>
                          {fileData.progress > 0 && fileData.progress < 100 && (
                            <Progress value={fileData.progress} className="mt-2" />
                          )}
                          {fileData.uploaded && extractedData && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>
                                Dados extraídos {extractedData.confidence === 'high' ? '(alta confiança)' : extractedData.confidence === 'medium' ? '(média confiança)' : '(baixa confiança)'}
                              </span>
                            </motion.div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFiles([])
                            setExtractedData(null)
                          }}
                          disabled={isUploading || isExtracting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    onClick={handleNextStep}
                    disabled={files.length === 0 || !files[0].uploaded}
                    size="lg"
                  >
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </StepContent>

      {/* Step 2: Review and Edit */}
      <StepContent step={2} currentStep={currentStep}>
        <Card className="w-full">
          <CardContent className="p-6 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Revisar e Editar Dados</h2>
              <p className="text-muted-foreground">
                Confirme os dados extraídos e faça ajustes se necessário.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
            >
              <form.Field name="clientId">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Cliente *</Label>
                    <select
                      id={field.name}
                      name={field.name}
                      value={isNewClient ? '__new__' : field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setIsNewClient(true)
                          setNewClientName('')
                          field.handleChange('')
                        } else {
                          setIsNewClient(false)
                          field.handleChange(e.target.value)
                        }
                      }}
                      className="w-full p-2 border rounded-md bg-background"
                      disabled={isUploading || isCreatingInvoice}
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}{(client.requires_timesheet === 1 || client.requires_timesheet === true) ? ' (requer timesheet)' : ''}
                        </option>
                      ))}
                      <option value="__new__">➕ Criar Novo Cliente</option>
                    </select>
                    {isNewClient && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-2"
                      >
                        <Label htmlFor="newClientName">Nome do Novo Cliente *</Label>
                        <input
                          id="newClientName"
                          type="text"
                          value={newClientName}
                          onChange={(e) => {
                            setNewClientName(e.target.value)
                            // Use a temporary ID based on name for validation
                            field.handleChange(`__new__${e.target.value}`)
                          }}
                          placeholder="Digite o nome do cliente"
                          className="w-full p-2 border rounded-md bg-background"
                          disabled={isUploading || isCreatingInvoice}
                        />
                        <p className="text-xs text-muted-foreground">
                          O cliente será criado automaticamente sem email. Você poderá adicionar o email depois.
                        </p>
                      </motion.div>
                    )}
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {String(field.state.meta.errors[0])}
                      </p>
                    )}
                    {selectedClient && !isNewClient && (
                      <p className="text-sm text-muted-foreground">
                        Email: {selectedClient.email || <span className="text-amber-600 dark:text-amber-400 font-semibold">Não configurado</span>}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="invoiceAmount">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="month">
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
                    </div>
                  )}
                </form.Field>
                <form.Field name="year">
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
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Add timesheet if needed */}
              {selectedClient?.requires_timesheet && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      Este cliente requer um arquivo de timesheet
                    </p>
                  </div>

                  {files.filter(f => f.fileType === 'timesheet').length === 0 && (
                    <Card {...getRootProps()} className="border-dashed border-2 cursor-pointer hover:border-primary">
                      <CardContent className="p-6">
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm font-medium">Adicionar Timesheet</p>
                          <p className="text-xs text-muted-foreground">Clique ou arraste arquivo</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Files list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Arquivos Anexados</Label>
                  <div className="space-y-2">
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
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={fileData.fileType}
                            onChange={(e) => setFileType(index, e.target.value as 'invoice' | 'timesheet')}
                            className="text-sm p-1 border rounded bg-background"
                            disabled={isUploading || isCreatingInvoice}
                          >
                            <option value="invoice">Invoice</option>
                            {(requiresTimesheet === true || requiresTimesheet === 1) && <option value="timesheet">Timesheet</option>}
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={isUploading || isCreatingInvoice}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              <div className="flex justify-between gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={isUploading || isCreatingInvoice}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!canProceed || isUploading || isCreatingInvoice}
                >
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </StepContent>

      {/* Step 3: Confirmation */}
      <StepContent step={3} currentStep={currentStep}>
        <Card className="w-full">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Confirmar Criação</h2>
              <p className="text-muted-foreground">
                Revise os dados antes de criar a invoice
              </p>
            </div>

            <InvoiceSummary
              client={selectedClient}
              invoiceAmount={form.state.values.invoiceAmount}
              month={form.state.values.month}
              year={form.state.values.year}
              files={files.map(f => ({
                fileKey: f.fileKey || '',
                fileType: f.fileType,
                originalName: f.file.name,
                fileSize: f.file.size,
              }))}
            />

            <div className="flex justify-between gap-2 pt-6 mt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousStep}
                disabled={isUploading || isCreatingInvoice}
                size="lg"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  form.handleSubmit()
                }}
                disabled={!canProceed || isUploading || isCreatingInvoice}
                size="lg"
              >
                  {isCreatingInvoice ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Criar Invoice
                    </>
                  )}
                </Button>
              </div>
          </CardContent>
        </Card>
      </StepContent>
    </div>
  )
}
