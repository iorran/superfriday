'use client'

import { useDropzone, type DropzoneOptions, type FileRejection } from 'react-dropzone'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface UploadDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void
  disabled?: boolean
  isUploading?: boolean
  isProcessing?: boolean
  multiple?: boolean
  accept?: DropzoneOptions['accept']
  maxSize?: number
  isDragActiveText?: string
  defaultText?: string
  subText?: string
  processingText?: string
  processingSubText?: string
  compact?: boolean
  className?: string
}

const UploadDropzone = ({
  onDrop,
  disabled = false,
  isUploading = false,
  isProcessing = false,
  multiple = true,
  accept,
  maxSize = 10 * 1024 * 1024,
  isDragActiveText = 'Solte os arquivos aqui',
  defaultText = 'Arraste e solte os arquivos aqui',
  subText = 'ou clique para selecionar arquivo',
  processingText = 'Processando...',
  processingSubText = 'Extraindo dados do arquivo',
  compact = false,
  className = '',
}: UploadDropzoneProps) => {
  const { toast } = useToast()

  const handleDropRejected = (fileRejections: FileRejection[]) => {
    fileRejections.forEach(({ file, errors }) => {
      errors.forEach((error) => {
        if (error.code === 'file-too-large') {
          toast({
            title: 'Arquivo muito grande',
            description: `${file.name} excede o tamanho máximo de ${Math.round(maxSize / (1024 * 1024))}MB`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Erro no arquivo',
            description: `${file.name}: ${error.message}`,
            variant: 'destructive',
          })
        }
      })
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || isUploading || isProcessing,
    multiple,
    accept,
    maxSize,
    onDropRejected: handleDropRejected,
  })

  const isLoading = isUploading || isProcessing

  return (
    <Card
      {...getRootProps()}
      className={`w-full transition-all ${
        isLoading || disabled ? 'cursor-wait opacity-60' : 'cursor-pointer'
      } ${
        isDragActive
          ? 'border-primary border-2 bg-primary/5'
          : 'border-dashed border-2 hover:border-primary hover:bg-muted/50'
      } ${className}`}
      role="button"
      tabIndex={0}
      aria-label="Área de upload de arquivos"
      aria-disabled={isLoading || disabled}
    >
      <CardContent className={compact ? 'p-6' : 'p-12'}>
        <input {...getInputProps()} aria-label="Selecionar arquivo" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          {isProcessing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-12 w-12 text-primary" aria-hidden="true" />
              </motion.div>
              <p className="text-lg font-semibold">{processingText}</p>
              <p className="text-sm text-muted-foreground">{processingSubText}</p>
            </>
          ) : (
            <>
              <Upload 
                className={compact ? 'h-8 w-8 text-muted-foreground' : 'h-16 w-16 text-muted-foreground'} 
                aria-hidden="true"
              />
              <div className="text-center">
                <p className={compact ? 'text-sm font-medium' : 'text-xl font-bold'}>
                  {isDragActive ? isDragActiveText : defaultText}
                </p>
                {!compact && (
                  <p className="text-sm text-muted-foreground mt-2">{subText}</p>
                )}
              </div>
              {!compact && accept && (
                <p className="text-xs text-muted-foreground">
                  {accept['application/pdf'] 
                    ? `Apenas arquivos PDF (máx. ${Math.round(maxSize / (1024 * 1024))}MB)` 
                    : `Tamanho máximo: ${Math.round(maxSize / (1024 * 1024))}MB`}
                </p>
              )}
            </>
          )}
        </motion.div>
      </CardContent>
    </Card>
  )
}

export default UploadDropzone

