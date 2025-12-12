'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { usePDFExtraction } from '@/hooks/use-pdf-extraction'
import type { ExtractedPDFData } from '@/types'
import { 
  Loader2, 
  CheckCircle2, 
  Folder, 
  FileText, 
  Search,
  LogOut
} from 'lucide-react'
import { motion } from 'framer-motion'

interface GoogleDriveFile {
  id: string
  name: string
  size: number
  modifiedTime?: string
  parents?: string[]
}

interface GoogleDriveFolder {
  id: string
  name: string
  parents?: string[]
}

interface GoogleDrivePickerProps {
  onFilesSelected: (files: Array<{
    file: File
    fileKey: string
    progress: number
    uploaded: boolean
    extractedData?: ExtractedPDFData | null
    invoiceAmount?: number
    month?: number
    year?: number
  }>) => void
}

/**
 * Check Google Drive connection status
 */
async function checkGoogleDriveStatus(): Promise<boolean> {
  const response = await fetch('/api/google-drive/status')
  if (!response.ok) return false
  const data = await response.json()
  return data.connected || false
}

/**
 * List folders from Google Drive
 */
async function listFolders(): Promise<GoogleDriveFolder[]> {
  const response = await fetch('/api/google-drive/folders')
  if (!response.ok) {
    throw new Error('Failed to list folders')
  }
  const data = await response.json()
  return data.folders || []
}

/**
 * List files in a folder
 */
async function listFolderFiles(folderId: string): Promise<GoogleDriveFile[]> {
  const response = await fetch(`/api/google-drive/folders/${folderId}/files`)
  if (!response.ok) {
    throw new Error('Failed to list folder files')
  }
  const data = await response.json()
  return data.files || []
}

/**
 * Search files in Google Drive
 */
async function searchFiles(query?: string): Promise<GoogleDriveFile[]> {
  const url = query 
    ? `/api/google-drive/files?query=${encodeURIComponent(query)}`
    : '/api/google-drive/files'
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to search files')
  }
  const data = await response.json()
  return data.files || []
}

/**
 * Download file from Google Drive
 */
async function downloadFile(fileId: string): Promise<{ fileKey: string; fileName: string; fileSize: number; url?: string }> {
  const response = await fetch('/api/google-drive/files/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  })
  
  if (!response.ok) {
    let errorMessage = 'Failed to download file'
    try {
      const error = await response.json()
      errorMessage = error.message || errorMessage
    } catch {
      // If response is not JSON, try to get text
      try {
        const text = await response.text()
        errorMessage = text || errorMessage
      } catch {
        // Use status text as fallback
        errorMessage = response.statusText || errorMessage
      }
    }
    throw new Error(errorMessage)
  }
  
  // Check if response has content
  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text()
    if (!text) {
      throw new Error('Empty response from server')
    }
    throw new Error(`Unexpected response type: ${contentType}`)
  }
  
  try {
    return await response.json()
  } catch (error) {
    const text = await response.text()
    console.error('Failed to parse JSON response:', { text, error })
    throw new Error('Invalid response from server')
  }
}

/**
 * Disconnect Google Drive
 */
async function disconnectGoogleDrive(): Promise<void> {
  const response = await fetch('/api/google-drive/status', {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to disconnect Google Drive')
  }
}

const GoogleDrivePicker = ({ onFilesSelected }: GoogleDrivePickerProps) => {
  const { toast } = useToast()
  const { extractFromFile } = usePDFExtraction()
  const queryClient = useQueryClient()
  
  const [mode, setMode] = useState<'folder' | 'file'>('folder')
  const [selectedFolderId, setSelectedFolderId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set())
  const [downloadedFiles, setDownloadedFiles] = useState<Map<string, {
    file: File
    fileKey: string
    progress: number
    uploaded: boolean
    extractedData?: ExtractedPDFData | null
    invoiceAmount?: number
    month?: number
    year?: number
  }>>(new Map())

  // Check connection status
  const { data: isConnected, refetch: refetchStatus } = useQuery({
    queryKey: ['google-drive-status'],
    queryFn: checkGoogleDriveStatus,
    refetchInterval: false,
  })

  // List folders
  const { data: folders = [], isLoading: loadingFolders } = useQuery({
    queryKey: ['google-drive-folders'],
    queryFn: listFolders,
    enabled: isConnected === true && mode === 'folder',
  })

  // List files in selected folder
  const { data: folderFiles = [], isLoading: loadingFolderFiles } = useQuery({
    queryKey: ['google-drive-folder-files', selectedFolderId],
    queryFn: () => listFolderFiles(selectedFolderId),
    enabled: isConnected === true && mode === 'folder' && !!selectedFolderId,
  })

  // Search files
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ['google-drive-search', searchQuery],
    queryFn: () => searchFiles(searchQuery || undefined),
    enabled: isConnected === true && mode === 'file',
    refetchOnWindowFocus: false,
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleDrive,
    onSuccess: () => {
      queryClient.setQueryData(['google-drive-status'], false)
      setSelectedFileIds(new Set())
      setDownloadedFiles(new Map())
      toast({
        title: "Desconectado",
        description: "Google Drive foi desconectado com sucesso.",
        variant: "default",
      })
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao desconectar Google Drive",
        variant: "destructive",
      })
    },
  })

  // Handle connect button click
  const handleConnect = () => {
    window.location.href = '/api/google-drive/auth'
  }

  // Handle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }

  // Download and process selected files
  const handleDownloadFiles = async () => {
    const filesToDownload = mode === 'folder' 
      ? folderFiles.filter(f => selectedFileIds.has(f.id))
      : searchResults.filter(f => selectedFileIds.has(f.id))

    if (filesToDownload.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione pelo menos um arquivo.",
        variant: "destructive",
      })
      return
    }

    setDownloadingFiles(new Set(filesToDownload.map(f => f.id)))

    try {
      const processedFiles: Array<{
        file: File
        fileKey: string
        progress: number
        uploaded: boolean
        extractedData?: ExtractedPDFData | null
        invoiceAmount?: number
        month?: number
        year?: number
      }> = []

      for (const file of filesToDownload) {
        try {
          // Download file
          const downloadResult = await downloadFile(file.id)
          
          // Fetch file as Blob to create File object
          // Use direct blob URL if available, otherwise use API route
          let fileResponse: Response
          if (downloadResult.url) {
            // Use direct blob URL (preferred - faster and more reliable)
            fileResponse = await fetch(downloadResult.url)
          } else {
            // Fallback to API route
            const encodedFileKey = encodeURIComponent(downloadResult.fileKey).replace(/%2F/g, '/')
            fileResponse = await fetch(`/api/files/${encodedFileKey}`)
          }
          
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`)
          }
          
          const blob = await fileResponse.blob()
          
          if (blob.size === 0) {
            throw new Error('Downloaded file is empty')
          }
          
          const fileObj = new File([blob], downloadResult.fileName, { type: 'application/pdf' })

          // Extract data from PDF
          const extracted = await extractFromFile(fileObj)

          processedFiles.push({
            file: fileObj,
            fileKey: downloadResult.fileKey,
            progress: 100,
            uploaded: true,
            extractedData: extracted || null,
            invoiceAmount: extracted?.amount || undefined,
            month: extracted?.month || undefined,
            year: extracted?.year || undefined,
          })

          setDownloadedFiles(prev => new Map(prev).set(file.id, processedFiles[processedFiles.length - 1]))
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error)
          toast({
            title: "Erro",
            description: `Falha ao processar ${file.name}`,
            variant: "destructive",
          })
        } finally {
          setDownloadingFiles(prev => {
            const next = new Set(prev)
            next.delete(file.id)
            return next
          })
        }
      }

      if (processedFiles.length > 0) {
        onFilesSelected(processedFiles)
        toast({
          title: "Sucesso",
          description: `${processedFiles.length} arquivo(s) importado(s) do Google Drive.`,
          variant: "default",
        })
        // Clear selections
        setSelectedFileIds(new Set())
      }
    } catch (error) {
      console.error('Error downloading files:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao importar arquivos",
        variant: "destructive",
      })
    } finally {
      setDownloadingFiles(new Set())
    }
  }

  // Check URL params for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'google-drive') {
      toast({
        title: "Conectado",
        description: "Google Drive conectado com sucesso!",
        variant: "default",
      })
      refetchStatus()
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('error')) {
      toast({
        title: "Erro de Conexão",
        description: params.get('error') || "Falha ao conectar Google Drive",
        variant: "destructive",
      })
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [refetchStatus, toast])

  if (isConnected === false) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Importar do Google Drive</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Conecte sua conta do Google Drive para importar invoices.
            </p>
            <Button onClick={handleConnect} size="lg">
              Conectar Google Drive
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isConnected === undefined) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const filesToShow = mode === 'folder' ? folderFiles : searchResults
  const hasSelection = selectedFileIds.size > 0
  const isDownloading = downloadingFiles.size > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Importar do Google Drive</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Desconectar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode selector */}
        <div className="flex gap-2" role="tablist" aria-label="Modo de seleção de arquivos">
          <Button
            variant={mode === 'folder' ? 'default' : 'outline'}
            onClick={() => {
              setMode('folder')
              setSelectedFileIds(new Set())
            }}
            size="sm"
            role="tab"
            aria-selected={mode === 'folder'}
            aria-label="Selecionar por pasta"
          >
            <Folder className="h-4 w-4 mr-2" aria-hidden="true" />
            Por Pasta
          </Button>
          <Button
            variant={mode === 'file' ? 'default' : 'outline'}
            onClick={() => {
              setMode('file')
              setSelectedFileIds(new Set())
            }}
            size="sm"
            role="tab"
            aria-selected={mode === 'file'}
            aria-label="Buscar arquivos"
          >
            <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
            Buscar Arquivos
          </Button>
        </div>

        {/* Folder mode */}
        {mode === 'folder' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-select">Selecione uma pasta</Label>
              <select
                id="folder-select"
                value={selectedFolderId}
                onChange={(e) => {
                  setSelectedFolderId(e.target.value)
                  setSelectedFileIds(new Set())
                }}
                className="w-full p-2 border rounded-md bg-background"
                disabled={loadingFolders}
                aria-label="Selecionar pasta do Google Drive"
              >
                <option value="">Selecione uma pasta...</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {loadingFolderFiles && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {selectedFolderId && !loadingFolderFiles && folderFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum arquivo PDF encontrado nesta pasta.
              </p>
            )}
          </div>
        )}

        {/* File search mode */}
        {mode === 'file' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar arquivos PDF</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome do arquivo..."
                    className="w-full pl-10 p-2 border rounded-md bg-background"
                  />
                </div>
              </div>
            </div>

            {searching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!searching && searchResults.length === 0 && searchQuery && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum arquivo encontrado.
              </p>
            )}
          </div>
        )}

        {/* Files list */}
        {filesToShow.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto" role="listbox" aria-label="Lista de arquivos disponíveis">
            <Label id="files-list-label">Arquivos ({selectedFileIds.size} selecionado(s))</Label>
            {filesToShow.map((file) => {
              const isSelected = selectedFileIds.has(file.id)
              const isDownloadingFile = downloadingFiles.has(file.id)
              const isDownloaded = downloadedFiles.has(file.id)

              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => !isDownloadingFile && toggleFileSelection(file.id)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isDownloadingFile) {
                      e.preventDefault()
                      toggleFileSelection(file.id)
                    }
                  }}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${file.name}${isSelected ? ', selecionado' : ''}`}
                  tabIndex={0}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFileSelection(file.id)}
                    disabled={isDownloadingFile}
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Selecionar ${file.name}`}
                  />
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                      {file.modifiedTime && ` • ${new Date(file.modifiedTime).toLocaleDateString('pt-PT')}`}
                    </p>
                  </div>
                  {isDownloadingFile && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  )}
                  {isDownloaded && !isDownloadingFile && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Download button */}
        {hasSelection && (
          <Button
            onClick={handleDownloadFiles}
            disabled={isDownloading}
            size="lg"
            className="w-full"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Importar {selectedFileIds.size} Arquivo(s)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default GoogleDrivePicker
