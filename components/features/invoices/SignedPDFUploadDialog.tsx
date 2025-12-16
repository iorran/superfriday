'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useUploadSignedPDF } from '@/hooks/use-upload-signed-pdf'
import { useUploadTimesheet } from '@/hooks/use-upload-timesheet'
import { useToast } from '@/components/ui/use-toast'

interface SignedPDFUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  requiresTimesheet?: boolean
  onSuccess: () => void
}

const SignedPDFUploadDialog = ({
  open,
  onOpenChange,
  invoiceId,
  requiresTimesheet = false,
  onSuccess,
}: SignedPDFUploadDialogProps) => {
  const { toast } = useToast()
  const uploadSignedPDFMutation = useUploadSignedPDF()
  const uploadTimesheetMutation = useUploadTimesheet()
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState<File | null>(null)
  const [selectedTimesheetFile, setSelectedTimesheetFile] = useState<File | null>(null)

  const handleInvoiceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo PDF",
          variant: "destructive",
        })
        return
      }
      setSelectedInvoiceFile(file)
    }
  }

  const handleTimesheetFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedTimesheetFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedInvoiceFile) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo PDF assinado",
        variant: "destructive",
      })
      return
    }

    if (requiresTimesheet && !selectedTimesheetFile) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de timesheet",
        variant: "destructive",
      })
      return
    }

    try {
      // Upload invoice PDF
      await uploadSignedPDFMutation.mutateAsync({ invoiceId, file: selectedInvoiceFile })
      
      // Upload timesheet if provided
      if (selectedTimesheetFile) {
        await uploadTimesheetMutation.mutateAsync({ invoiceId, file: selectedTimesheetFile })
      }

      toast({
        title: "Arquivos Enviados",
        description: selectedTimesheetFile 
          ? "PDF assinado e timesheet foram enviados com sucesso"
          : "PDF assinado foi enviado com sucesso",
        variant: "default",
      })
      onSuccess()
      onOpenChange(false)
      setSelectedInvoiceFile(null)
      setSelectedTimesheetFile(null)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Falha ao enviar arquivos"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload de Arquivos</DialogTitle>
          <DialogDescription>
            Esta invoice precisa ser assinada antes de ser enviada. Faça upload do PDF assinado{requiresTimesheet ? ' e do timesheet' : ''}:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="signedPdfUpload">PDF Assinado *</Label>
            <input
              id="signedPdfUpload"
              type="file"
              accept="application/pdf"
              onChange={handleInvoiceFileSelect}
              className="w-full p-2 border rounded-md bg-background"
            />
            {selectedInvoiceFile && (
              <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                <span className="text-sm">{selectedInvoiceFile.name}</span>
              </div>
            )}
          </div>

          {requiresTimesheet && (
            <div className="space-y-2">
              <Label htmlFor="timesheetUpload">Timesheet *</Label>
              <input
                id="timesheetUpload"
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleTimesheetFileSelect}
                className="w-full p-2 border rounded-md bg-background"
              />
              {selectedTimesheetFile && (
                <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="text-sm">{selectedTimesheetFile.name}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploadSignedPDFMutation.isPending || uploadTimesheetMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={uploadSignedPDFMutation.isPending || uploadTimesheetMutation.isPending || !selectedInvoiceFile || (requiresTimesheet && !selectedTimesheetFile)}
            >
              {(uploadSignedPDFMutation.isPending || uploadTimesheetMutation.isPending) ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SignedPDFUploadDialog
