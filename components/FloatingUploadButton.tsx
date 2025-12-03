'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import FileUpload from './FileUpload'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function FloatingUploadButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-50 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group"
        aria-label="Upload invoice"
      >
        <Upload className="h-6 w-6 transition-transform group-hover:scale-110" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Invoice</DialogTitle>
          </DialogHeader>
          <FileUpload
            onUploadSuccess={() => {
              setIsOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

