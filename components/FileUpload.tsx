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
import {
  FileItemCard,
  UploadDropzone,
  ClientSelectField,
  InvoiceFormFields,
  ExistingFilesList,
} from '@/components/features/file-upload'
import { uploadFile } from '@/lib/client/storage'
import { useClients } from '@/hooks/use-clients'
import { useInvoice, useCreateInvoice, useUpdateInvoice, useDeleteInvoiceFile } from '@/hooks/use-invoices'
import { usePDFExtraction } from '@/hooks/use-pdf-extraction'
import { Upload, FileText, Loader2, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react'
import type { Client, InvoiceFile, ExtractedPDFData } from '@/types'
import { invoiceSchema, type InvoiceFormData } from '@/lib/shared/validations'

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

const FileUpload = ({ onUploadSuccess, editingInvoiceId, onCancel }: FileUploadProps) => {
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

  const handlePDFDrop = useCallback(async (acceptedFiles: File[]) => {
    const pdfFile = acceptedFiles.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    
    if (!pdfFile) {
      toast({
        title: "Arquivo Inválido",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive",
      })
      return
    }

    const extracted = await extractFromFile(pdfFile)
    
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
      
      if (extracted) {
        setExtractedData(extracted)
        
        if (extracted.amount) {
          form.setFieldValue('invoiceAmount', extracted.amount)
        }
        if (extracted.month) {
          form.setFieldValue('month', extracted.month)
        }
        if (extracted.year) {
          form.setFieldValue('year', extracted.year)
        }
        
        if (extracted.clientName) {
          const existingClient = clients.find(c => 
            c.name.toLowerCase().trim() === extracted.clientName!.toLowerCase().trim()
          )
          
          if (existingClient) {
            form.setFieldValue('clientId', existingClient.id)
            setIsNewClient(false)
            setNewClientName('')
          } else {
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
  }, [toast, extractFromFile, form, clients])

  const handleTimesheetDrop = useCallback(async (acceptedFiles: File[]) => {
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (currentStep === 1) {
      await handlePDFDrop(acceptedFiles)
    } else {
      await handleTimesheetDrop(acceptedFiles)
    }
  }, [currentStep, handlePDFDrop, handleTimesheetDrop])

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

        let finalClientId = value.clientId
        let finalClientName: string | undefined = undefined
        
        if (isNewClient) {
          const nameToUse = extractedData?.clientName || newClientName.trim()
          if (nameToUse) {
            finalClientId = `__new__${nameToUse}`
            finalClientName = nameToUse
          }
        } else {
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

  // Editing mode layout
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
                        aria-label="Selecionar cliente"
                        aria-required="true"
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

                <InvoiceFormFields
                  invoiceAmount={form.state.values.invoiceAmount}
                  month={form.state.values.month}
                  year={form.state.values.year}
                  onInvoiceAmountChange={(v) => form.setFieldValue('invoiceAmount', v)}
                  onMonthChange={(v) => form.setFieldValue('month', v)}
                  onYearChange={(v) => form.setFieldValue('year', v)}
                  disabled={isUploading || isCreatingInvoice}
                />
              </form>
            )}
          </CardContent>
        </Card>

        <ExistingFilesList
          files={existingFiles}
          onRemove={removeExistingFile}
          disabled={isUploading || isCreatingInvoice}
        />

        <Card 
          {...getRootProps()} 
          className={`w-full transition-all ${
            isUploading || isCreatingInvoice || !clientId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          } ${
            isDragActive ? 'border-blue-500 border-2 bg-blue-50 dark:bg-blue-950' : 'border-dashed border-2 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Área de upload de arquivos"
        >
          <CardContent className="p-8">
            <input {...getInputProps()} aria-label="Selecionar arquivo" />
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
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
              <div className="space-y-3" role="list" aria-label="Arquivos adicionados">
                {files.map((fileData, index) => (
                  <FileItemCard
                    key={index}
                    fileName={fileData.file.name}
                    fileSize={fileData.file.size}
                    fileType={fileData.fileType}
                    progress={fileData.progress}
                    uploaded={fileData.uploaded}
                    onRemove={() => removeFile(index)}
                    onFileTypeChange={(type) => setFileType(index, type)}
                    disabled={isUploading || isCreatingInvoice || fileData.uploaded}
                    requiresTimesheet={requiresTimesheet === true || requiresTimesheet === 1}
                  />
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
              aria-label={isUploading ? 'Fazendo Upload' : isCreatingInvoice ? 'Atualizando Invoice' : 'Atualizar Invoice'}
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
              <UploadDropzone
                onDrop={handlePDFDrop}
                disabled={isUploading}
                isProcessing={isExtracting}
                multiple={false}
                accept={{ 'application/pdf': ['.pdf'] }}
                isDragActiveText="Solte o PDF aqui"
                defaultText="Arraste e solte o PDF aqui"
                processingText="Processando PDF..."
                processingSubText="Extraindo dados do arquivo"
              />
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
                          <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{fileData.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(fileData.file.size / 1024).toFixed(2)} KB
                          </p>
                          {fileData.progress > 0 && fileData.progress < 100 && (
                            <Progress value={fileData.progress} className="mt-2" aria-label={`Progresso: ${fileData.progress}%`} />
                          )}
                          {fileData.uploaded && extractedData && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
                            >
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
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
                          aria-label="Remover arquivo"
                        >
                          <FileText className="h-4 w-4" aria-hidden="true" />
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
                    aria-label="Continuar para próximo passo"
                  >
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
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
              <ClientSelectField
                value={clientId}
                isNewClient={isNewClient}
                newClientName={newClientName}
                clients={clients}
                selectedClient={selectedClient}
                disabled={isUploading || isCreatingInvoice}
                onClientChange={(id) => form.setFieldValue('clientId', id)}
                onNewClientToggle={setIsNewClient}
                onNewClientNameChange={setNewClientName}
              />

              <div className="mt-4">
                <InvoiceFormFields
                  invoiceAmount={form.state.values.invoiceAmount}
                  month={form.state.values.month}
                  year={form.state.values.year}
                  onInvoiceAmountChange={(v) => form.setFieldValue('invoiceAmount', v)}
                  onMonthChange={(v) => form.setFieldValue('month', v)}
                  onYearChange={(v) => form.setFieldValue('year', v)}
                  disabled={isUploading || isCreatingInvoice}
                />
              </div>

              {/* Add timesheet if needed */}
              {selectedClient?.requires_timesheet && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      Este cliente requer um arquivo de timesheet
                    </p>
                  </div>

                  {files.filter(f => f.fileType === 'timesheet').length === 0 && (
                    <UploadDropzone
                      onDrop={handleTimesheetDrop}
                      disabled={isUploading || isCreatingInvoice}
                      compact={true}
                      defaultText="Adicionar Timesheet"
                      subText="Clique ou arraste arquivo"
                    />
                  )}
                </div>
              )}

              {/* Files list */}
              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label>Arquivos Anexados</Label>
                  <div className="space-y-2" role="list" aria-label="Arquivos anexados">
                    {files.map((fileData, index) => (
                      <FileItemCard
                        key={index}
                        fileName={fileData.file.name}
                        fileSize={fileData.file.size}
                        fileType={fileData.fileType}
                        onRemove={() => removeFile(index)}
                        onFileTypeChange={(type) => setFileType(index, type)}
                        disabled={isUploading || isCreatingInvoice}
                        requiresTimesheet={requiresTimesheet === true || requiresTimesheet === 1}
                      />
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
                  aria-label="Voltar para passo anterior"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!canProceed || isUploading || isCreatingInvoice}
                  aria-label="Continuar para próximo passo"
                >
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
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
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" aria-hidden="true" />
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
                aria-label="Voltar para passo anterior"
              >
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
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
                aria-label={isCreatingInvoice ? 'Criando invoice' : 'Criar invoice'}
              >
                {isCreatingInvoice ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
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

export default FileUpload
