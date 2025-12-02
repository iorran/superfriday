'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { getClients } from '@/lib/client/db-client'
import { uploadFile } from '@/lib/client/storage-client'

interface FileUploadProps {
  onUploadSuccess?: () => void
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const clientsList = await getClients()
      setClients(clientsList)
      // Auto-select first client if none selected and clients exist
      if (clientsList.length > 0 && (!selectedClientId || selectedClientId === '')) {
        setSelectedClientId(clientsList[0].id)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      toast({
        title: "Error",
        description: "Failed to load clients. Please refresh the page.",
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate client selection
    const clientIdToUse = selectedClientId || clients[0]?.id
    if (!clientIdToUse) {
      toast({
        title: "Client Required",
        description: "Please select a client before uploading. If no clients exist, create one first.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadedFile(null)

    try {
      // Simulate progress (since we're using fetch API)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // Upload file via API
      const result = await uploadFile(
        file,
        clientIdToUse,
        invoiceAmount || undefined,
        dueDate || undefined
      )

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadedFile(result.fileName)

      toast({
        title: "Upload Successful",
        description: `File "${file.name}" uploaded successfully!`,
        variant: "default",
      })

      // Reset form
      setInvoiceAmount('')
      setDueDate('')

      // Notify parent component to refresh file list
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }, [selectedClientId, clients, invoiceAmount, dueDate, toast, onUploadSuccess])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0])
    }
  }, [handleFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    multiple: false,
  })

  const canUpload = clients.length > 0 && (selectedClientId || clients[0]?.id)

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold">Upload Invoice</h2>
      
      <Card className="w-full">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <select
              id="client"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={isUploading || clients.length === 0}
              required
            >
              {clients.length === 0 ? (
                <option value="">No clients available - Please create a client first</option>
              ) : (
                <>
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {clients.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Go to the Clients tab to create a client first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Invoice Amount (optional)</Label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 border rounded-md"
                disabled={isUploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (optional)</Label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={isUploading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        {...getRootProps()}
        className={`w-full transition-all ${
          isUploading || !canUpload ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${
          isDragActive 
            ? 'border-blue-500 border-2 bg-blue-50 dark:bg-blue-950' 
            : 'border-dashed border-2 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900'
        }`}
      >
        <CardContent className="p-8">
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            {!canUpload ? (
              <>
                <p className="text-xl font-bold text-muted-foreground">
                  Please select a client first
                </p>
                <p className="text-sm text-muted-foreground">
                  You need to select a client before uploading files
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to select a file
                </p>
              </>
            )}
            {isUploading && (
              <div className="w-full space-y-2 pt-4">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(uploadProgress)}% uploaded
                </p>
              </div>
            )}
            {uploadedFile && !isUploading && (
              <div className="space-y-2 pt-4 text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  ✓ Upload Complete
                </p>
                <p className="text-sm text-muted-foreground">
                  File: {uploadedFile}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

