'use client'

import { motion, type Variants } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Euro, Calendar, User, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import type { Client } from '@/types'

interface InvoiceSummaryProps {
  client: Client | null
  invoiceAmount: number
  dueDate: string
  month: number
  year: number
  files: Array<{
    fileKey: string
    fileType: 'invoice' | 'timesheet'
    originalName: string
    fileSize: number
  }>
  notes?: string | null
}

export function InvoiceSummary({
  client,
  invoiceAmount,
  dueDate,
  month,
  year,
  files,
  notes,
}: InvoiceSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const getMonthName = (month: number, year: number) => {
    try {
      const date = new Date(year, month - 1, 1)
      return format(date, "MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return `${month}/${year}`
    }
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i?: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: (i ?? 0) * 0.1,
        duration: 0.3,
        ease: 'easeOut',
      },
    }),
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 mb-6"
      >
        <CheckCircle2 className="h-6 w-6 text-primary" />
        <h3 className="text-xl font-semibold">Resumo da Invoice</h3>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Cliente</p>
                  <p className="text-lg font-semibold">
                    {client?.name || 'Não selecionado'}
                  </p>
                  {client?.email && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {client.email}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Amount Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={1 as number}
        >
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Euro className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Valor</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(invoiceAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Due Date Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={2 as number}
        >
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Data de Vencimento</p>
                  <p className="text-lg font-semibold">
                    {formatDate(dueDate)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Período: {getMonthName(month, year)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Files Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          custom={3 as number}
        >
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    Arquivos ({files.length})
                  </p>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <motion.div
                        key={file.fileKey}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="truncate flex-1">{file.originalName}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatFileSize(file.fileSize)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Notes */}
      {notes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-2">Notas</p>
              <p className="text-sm whitespace-pre-wrap">{notes}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

