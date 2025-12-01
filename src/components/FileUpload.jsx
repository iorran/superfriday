import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from '@aws-sdk/lib-storage'
import { Card, CardContent } from './ui/card'
import { Progress } from './ui/progress'
import { Label } from './ui/label'
import { useToast } from './ui/use-toast'
import { useR2Client } from '../lib/r2-client'
import { getClients } from '../lib/d1-client'
import { upsertInvoice } from '../lib/d1-client'

const FileUpload = ({ onUploadSuccess }) => {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const { toast } = useToast()
  const { client, config } = useR2Client()

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const clientsList = await getClients()
      setClients(clientsList)
      if (clientsList.length > 0 && !selectedClientId) {
        setSelectedClientId(clientsList[0].id)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const uploadFile = useCallback(async (file) => {
    if (!config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
      toast({
        title: "Configuration Error",
        description: "Please configure Cloudflare R2 credentials in environment variables",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadedFile(null)

    try {
      const fileName = `${Date.now()}-${file.name}`
      
      // Use Upload class for progress tracking
      const upload = new Upload({
        client: client,
        params: {
          Bucket: config.bucketName,
          Key: fileName,
          Body: file,
          ContentType: file.type,
        },
      })

      // Track upload progress
      upload.on('httpUploadProgress', (progress) => {
        if (progress.total) {
          const percentCompleted = Math.round((progress.loaded / progress.total) * 100)
          setUploadProgress(percentCompleted)
        }
      })

      await upload.done()
      
      setUploadProgress(100)
      setUploadedFile(fileName)

      // Save invoice to D1 database
      try {
        await upsertInvoice({
          fileKey: fileName,
          clientId: selectedClientId || clients[0]?.id,
          originalName: file.name,
          fileSize: file.size,
          invoiceAmount: invoiceAmount || null,
          dueDate: dueDate || null,
        })
      } catch (error) {
        console.error('Error saving invoice to D1:', error)
        toast({
          title: "Warning",
          description: "File uploaded but failed to save metadata. Please update manually.",
          variant: "destructive",
        })
      }
      
      toast({
        title: "Upload Successful",
        description: `File "${file.name}" uploaded successfully!`,
        variant: "success",
      })

      // Reset form
      setInvoiceAmount('')
      setDueDate('')

      // Notify parent component to refresh file list
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }, [config, client, toast, onUploadSuccess])

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      uploadFile(acceptedFiles[0])
    }
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading,
    multiple: false,
  })

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold">Upload Invoice</h2>
      
      <Card className="w-full">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <select
              id="client"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={isUploading || clients.length === 0}
            >
              {clients.length === 0 ? (
                <option value="">No clients available</option>
              ) : (
                clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))
              )}
            </select>
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
          isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        } ${
          isDragActive 
            ? 'border-blue-500 border-2 bg-blue-50 dark:bg-blue-950' 
            : 'border-dashed border-2 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900'
        }`}
      >
        <CardContent className="p-8">
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <p className="text-xl font-bold">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select a file
            </p>
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

      {!config.accessKeyId && (
        <Card className="w-full border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              ⚠️ Please configure Cloudflare R2 credentials in your .env file:
              <br />
              VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_BUCKET_NAME
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default FileUpload

