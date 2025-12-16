'use client'

import { Card, CardContent } from '@/components/ui/card'
import FileItemCard from './FileItemCard'

interface UploadedFile {
  file: File
  fileKey?: string
  fileType: 'invoice' | 'timesheet'
  progress: number
  uploaded: boolean
}

interface UploadedFilesListProps {
  files: UploadedFile[]
  onRemove: (index: number) => void
  onFileTypeChange: (index: number, fileType: 'invoice' | 'timesheet') => void
  disabled?: boolean
  requiresTimesheet?: boolean
  title?: string
}

const UploadedFilesList = ({
  files,
  onRemove,
  onFileTypeChange,
  disabled = false,
  requiresTimesheet = false,
  title = 'Arquivos Adicionados',
}: UploadedFilesListProps) => {
  if (files.length === 0) return null

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="space-y-3" role="list" aria-label={title}>
          {files.map((fileData, index) => (
            <FileItemCard
              key={index}
              fileName={fileData.file.name}
              fileSize={fileData.file.size}
              fileType={fileData.fileType}
              progress={fileData.progress}
              uploaded={fileData.uploaded}
              onRemove={() => onRemove(index)}
              onFileTypeChange={(type) => onFileTypeChange(index, type)}
              disabled={disabled || fileData.uploaded}
              requiresTimesheet={requiresTimesheet}
              variant="default"
              showTypeSelector={true}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default UploadedFilesList



