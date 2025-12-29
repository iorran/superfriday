'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import FileUpload from '@/components/FileUpload'

interface InvoiceEditDialogProps {
  invoiceId: string | null
  onClose: () => void
}

const InvoiceEditDialog = ({ invoiceId, onClose }: InvoiceEditDialogProps) => {
  return (
    <Dialog open={invoiceId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Invoice</DialogTitle>
        </DialogHeader>
        <FileUpload
          editingInvoiceId={invoiceId}
          onUploadSuccess={onClose}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}

export { InvoiceEditDialog }
export type { InvoiceEditDialogProps }




