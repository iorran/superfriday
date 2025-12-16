'use client'

import { Card, CardContent } from '@/components/ui/card'
import FileItemCard from './FileItemCard'

interface ExistingFile {
  id: string
  fileKey: string
  fileType: 'invoice' | 'timesheet'
  originalName: string
  fileSize: number
  isExisting: true
}

interface ExistingFilesListProps {
  files: ExistingFile[]
  onRemove: (fileId: string) => void
  disabled?: boolean
  title?: string
}

const ExistingFilesList = ({
  files,
  onRemove,
  disabled = false,
  title = 'Arquivos Existentes',
}: ExistingFilesListProps) => {
  if (files.length === 0) return null

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="space-y-3" role="list" aria-label={title}>
          {files.map((fileData) => (
            <FileItemCard
              key={fileData.id}
              fileName={fileData.originalName}
              fileSize={fileData.fileSize}
              fileType={fileData.fileType}
              onRemove={() => onRemove(fileData.id)}
              disabled={disabled}
              variant="existing"
              showTypeSelector={false}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ExistingFilesList



