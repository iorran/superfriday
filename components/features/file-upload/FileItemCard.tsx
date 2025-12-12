'use client'

import { FileText, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface FileItemCardProps {
  fileName: string
  fileSize: number
  fileType: 'invoice' | 'timesheet'
  progress?: number
  uploaded?: boolean
  showTypeSelector?: boolean
  requiresTimesheet?: boolean
  onRemove: () => void
  onFileTypeChange?: (fileType: 'invoice' | 'timesheet') => void
  disabled?: boolean
  variant?: 'default' | 'existing'
}

const FileItemCard = ({
  fileName,
  fileSize,
  fileType,
  progress = 100,
  uploaded = true,
  showTypeSelector = true,
  requiresTimesheet = false,
  onRemove,
  onFileTypeChange,
  disabled = false,
  variant = 'default',
}: FileItemCardProps) => {
  const sizeDisplay = fileSize > 0 
    ? `${(fileSize / 1024).toFixed(2)} KB` 
    : 'Tamanho desconhecido'

  const typeDisplay = fileType === 'invoice' ? 'Invoice' : 'Timesheet'

  return (
    <div
      className="flex items-center gap-3 p-3 border rounded-md bg-card"
      role="listitem"
      aria-label={`Arquivo ${fileName}`}
    >
      <FileText 
        className="h-5 w-5 text-muted-foreground shrink-0" 
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{fileName}</p>
        <p className="text-sm text-muted-foreground">
          {variant === 'existing' 
            ? `${sizeDisplay} • ${typeDisplay}` 
            : sizeDisplay}
        </p>
        {progress > 0 && progress < 100 && (
          <Progress 
            value={progress} 
            className="mt-2" 
            aria-label={`Progresso do upload: ${progress}%`}
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        {showTypeSelector && variant === 'default' && (
          <select
            value={fileType}
            onChange={(e) => onFileTypeChange?.(e.target.value as 'invoice' | 'timesheet')}
            className="text-sm p-1 border rounded bg-background"
            disabled={disabled || uploaded}
            aria-label="Tipo de arquivo"
          >
            <option value="invoice">Invoice</option>
            {requiresTimesheet && <option value="timesheet">Timesheet</option>}
          </select>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className={variant === 'existing' ? 'text-destructive hover:text-destructive' : ''}
          aria-label={`Remover arquivo ${fileName}`}
          tabIndex={0}
        >
          {variant === 'existing' ? (
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <X className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )
}

export default FileItemCard

