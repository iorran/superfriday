'use client'

import { useRouter } from 'next/navigation'
import InvoiceCreationForm from '@/components/InvoiceCreationForm'
import { useInvoiceCreation } from '@/hooks/use-invoice-creation'
import { useToast } from '@/components/ui/use-toast'
import type { InvoiceCreationFormData } from '@/lib/shared/validations'

const CriarInvoicePage = () => {
  const router = useRouter()
  const { toast } = useToast()
  const createInvoiceMutation = useInvoiceCreation()

  const handleSubmit = async (data: InvoiceCreationFormData) => {
    try {
      await createInvoiceMutation.mutateAsync(data)
      
      toast({
        title: "PDF Gerado",
        description: "O PDF da invoice foi gerado e baixado com sucesso",
        variant: "default",
      })
      
      router.push('/')
      router.refresh()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Falha ao gerar PDF"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Criar Invoice</h1>
        <p className="text-muted-foreground">
          Preencha os dados abaixo para gerar uma nova invoice em PDF
        </p>
      </div>

      <InvoiceCreationForm 
        onSubmit={handleSubmit}
        isLoading={createInvoiceMutation.isPending}
      />
    </div>
  )
}

export default CriarInvoicePage
