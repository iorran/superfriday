'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { useClients } from '@/hooks/use-clients'
import { usePDFExtraction } from '@/hooks/use-pdf-extraction'
import { uploadFile } from '@/lib/client/storage'
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ExtractedPDFData } from '@/types'
import GoogleDrivePicker from './GoogleDrivePicker'

interface FileWithData {
  file: File
  fileKey?: string
  progress: number
  uploaded: boolean
  extractedData?: ExtractedPDFData | null
  clientId?: string
  clientName?: string
  invoiceAmount?: number
  month?: number
  year?: number
  error?: string
}

const OldFilesImport = () => {
  const { data: clients = [] } = useClients()
  const { extractFromFile } = usePDFExtraction()
  const { toast } = useToast()
  
  const [files, setFiles] = useState<FileWithData[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  
  // Global client selection for all files
  const [globalClientId, setGlobalClientId] = useState<string>('')
  const [globalClientName, setGlobalClientName] = useState<string>('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(
      f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )

    if (pdfFiles.length === 0) {
      toast({
        title: "Arquivos Inválidos",
        description: "Por favor, selecione apenas arquivos PDF.",
        variant: "destructive",
      })
      return
    }

    // Add files to state
    const newFiles: FileWithData[] = pdfFiles.map(file => ({
      file,
      progress: 0,
      uploaded: false,
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Process each file: extract data and upload
    for (let i = 0; i < newFiles.length; i++) {
      const fileIndex = files.length + i
      const file = newFiles[i].file

      try {
        // Extract data from PDF
        const extracted = await extractFromFile(file)
        
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex 
            ? { ...f, extractedData: extracted || null }
            : f
        ))

        // Upload file
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex ? { ...f, progress: 50 } : f
        ))

        const result = await uploadFile(file)

        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex 
            ? { 
                ...f, 
                fileKey: result.fileKey, 
                progress: 100, 
                uploaded: true,
                // Pre-fill data from extraction
                invoiceAmount: extracted?.amount || undefined,
                month: extracted?.month || undefined,
                year: extracted?.year || undefined,
              }
            : f
        ))

        // Note: Client selection is now global, so we don't set it per file
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        setFiles(prev => prev.map((f, idx) => 
          idx === fileIndex 
            ? { 
                ...f, 
                error: error instanceof Error ? error.message : 'Erro ao processar arquivo',
                progress: 0,
              }
            : f
        ))
      }
    }
  }, [files.length, extractFromFile, toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    maxSize: 10 * 1024 * 1024,
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Handle files selected from Google Drive
  const handleGoogleDriveFiles = (googleFiles: Array<{
    file: File
    fileKey: string
    progress: number
    uploaded: boolean
    extractedData?: ExtractedPDFData | null
    invoiceAmount?: number
    month?: number
    year?: number
  }>) => {
    // Convert Google Drive files to FileWithData format
    const newFiles: FileWithData[] = googleFiles.map(gf => ({
      file: gf.file,
      fileKey: gf.fileKey,
      progress: gf.progress,
      uploaded: gf.uploaded,
      extractedData: gf.extractedData || null,
      invoiceAmount: gf.invoiceAmount,
      month: gf.month,
      year: gf.year,
    }))
    
    setFiles(prev => [...prev, ...newFiles])
  }

  const updateFileData = (index: number, updates: Partial<FileWithData>) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f))
  }

  const handleBulkImport = async () => {
    // Validate global client selection
    if (!globalClientId || (globalClientId === '__new__' && !globalClientName)) {
      toast({
        title: "Cliente Necessário",
        description: "Por favor, selecione um cliente para todas as invoices.",
        variant: "destructive",
      })
      return
    }

    // Validate all files have required data (except client, which is global)
    const invalidFiles = files.filter(f => 
      !f.uploaded || 
      !f.invoiceAmount || 
      !f.month || 
      !f.year
    )

    if (invalidFiles.length > 0) {
      toast({
        title: "Dados Incompletos",
        description: `Por favor, preencha todos os dados para ${invalidFiles.length} arquivo(s).`,
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      const totalFiles = files.length
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < files.length; i++) {
        const fileData = files[i]
        
        try {
          // Use global client for all files
          let finalClientId = globalClientId
          const finalClientName = globalClientName
          
          if (finalClientId === '__new__') {
            // Use the clientName as the temporary ID
            finalClientId = `__new__${finalClientName || ''}`
          }

          const response = await fetch('/api/invoices/import-old', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId: finalClientId,
              clientName: finalClientName,
              invoiceAmount: fileData.invoiceAmount,
              month: fileData.month,
              year: fileData.year,
              files: [{
                fileKey: fileData.fileKey,
                fileType: 'invoice' as const,
                originalName: fileData.file.name,
                fileSize: fileData.file.size,
              }],
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Erro ao importar invoice')
          }

          successCount++
        } catch (error) {
          console.error(`Error importing file ${fileData.file.name}:`, error)
          errorCount++
          updateFileData(i, {
            error: error instanceof Error ? error.message : 'Erro ao importar',
          })
        }

        setImportProgress(((i + 1) / totalFiles) * 100)
      }

      toast({
        title: "Importação Concluída",
        description: `${successCount} invoice(s) importada(s) com sucesso${errorCount > 0 ? `. ${errorCount} erro(s).` : '.'}`,
        variant: successCount > 0 ? "default" : "destructive",
      })

      if (successCount > 0) {
        // Clear successfully imported files
        setFiles(prev => prev.filter((f, i) => {
          const fileData = files[i]
          return !fileData.uploaded || fileData.error
        }))
      }
    } catch (error) {
      console.error('Bulk import error:', error)
      toast({
        title: "Erro na Importação",
        description: error instanceof Error ? error.message : "Falha ao importar invoices",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      setImportProgress(0)
    }
  }

  const uploadedFiles = files.filter(f => f.uploaded)
  const hasGlobalClient = globalClientId && (globalClientId !== '__new__' || (globalClientId === '__new__' && globalClientName))
  const canImport = uploadedFiles.length > 0 && hasGlobalClient && uploadedFiles.every(f => 
    f.invoiceAmount && f.month && f.year
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Fazer Upload dos Arquivos</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-primary hover:bg-muted/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">
              {isDragActive ? 'Solte os arquivos aqui' : 'Arraste e solte os PDFs aqui'}
            </p>
            <p className="text-sm text-muted-foreground">
              ou clique para selecionar arquivos
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Múltiplos arquivos permitidos (máx. 10MB cada)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Global Client Selection */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cliente para Todas as Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <select
                value={globalClientId}
                onChange={(e) => {
                  const selectedClient = clients.find(c => c.id === e.target.value)
                  setGlobalClientId(e.target.value)
                  setGlobalClientName(selectedClient?.name || '')
                }}
                className="w-full p-2 border rounded-md bg-background"
                disabled={isImporting}
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
                <option value="__new__">➕ Criar Novo Cliente</option>
              </select>
              {globalClientId === '__new__' && (
                <input
                  type="text"
                  placeholder="Nome do novo cliente"
                  value={globalClientName}
                  onChange={(e) => setGlobalClientName(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background mt-2"
                  disabled={isImporting}
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Este cliente será aplicado a todas as invoices importadas
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Arquivos para Importar ({uploadedFiles.length}/{files.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((fileData, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{fileData.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(fileData.file.size / 1024).toFixed(2)} KB
                      </p>
                      {fileData.progress > 0 && fileData.progress < 100 && (
                        <Progress value={fileData.progress} className="mt-2" />
                      )}
                      {fileData.error && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span>{fileData.error}</span>
                        </div>
                      )}
                      {fileData.uploaded && !fileData.error && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Upload concluído</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isImporting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {fileData.uploaded && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t">
                    {/* Invoice Amount */}
                    <div className="space-y-2">
                      <Label>Valor da Invoice *</Label>
                      <input
                        type="number"
                        step="0.01"
                        value={fileData.invoiceAmount || ''}
                        onChange={(e) => updateFileData(index, { 
                          invoiceAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        placeholder="0.00"
                        className="w-full p-2 border rounded-md bg-background"
                        disabled={isImporting}
                      />
                    </div>

                    {/* Month */}
                    <div className="space-y-2">
                      <Label>Mês *</Label>
                      <select
                        value={fileData.month || ''}
                        onChange={(e) => updateFileData(index, { 
                          month: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        className="w-full p-2 border rounded-md bg-background"
                        disabled={isImporting}
                      >
                        <option value="">Selecione...</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Year */}
                    <div className="space-y-2">
                      <Label>Ano *</Label>
                      <input
                        type="number"
                        value={fileData.year || ''}
                        onChange={(e) => updateFileData(index, { 
                          year: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="2024"
                        className="w-full p-2 border rounded-md bg-background"
                        min="2020"
                        max="2100"
                        disabled={isImporting}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            {isImporting && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importando invoices...</span>
                  <span>{Math.round(importProgress)}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {uploadedFiles.length} arquivo(s) pronto(s) para importar
                </p>
                <p className="text-sm text-muted-foreground">
                  Estas invoices serão marcadas como já enviadas ao cliente
                </p>
              </div>
              <Button
                onClick={handleBulkImport}
                disabled={!canImport || isImporting}
                size="lg"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Importar Todas
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Drive Section */}
      <GoogleDrivePicker onFilesSelected={handleGoogleDriveFiles} />
    </div>
  )
}

export default OldFilesImport
