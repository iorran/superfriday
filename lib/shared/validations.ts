import { z } from 'zod'

/**
 * Validation schemas for forms using Zod
 */

// Client form schema
export const clientSchema = z.object({
  name: z.string().min(1, 'Nome do cliente é obrigatório').trim(),
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  requiresTimesheet: z.boolean().default(false),
  ccEmails: z.array(z.string().email('Email inválido')).default([]),
})

export type ClientFormData = z.infer<typeof clientSchema>

// Invoice form schema
export const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  invoiceAmount: z.coerce.number().positive('Valor deve ser positivo'),
  month: z.coerce.number().int().min(1, 'Mês inválido').max(12, 'Mês inválido'),
  year: z.coerce.number().int().min(2020, 'Ano inválido').max(2100, 'Ano inválido'),
})

export type InvoiceFormData = z.infer<typeof invoiceSchema>

// Email template form schema
export const emailTemplateSchema = z.object({
  subject: z.string().min(1, 'Assunto é obrigatório').trim(),
  body: z.string().min(1, 'Corpo do email é obrigatório').trim(),
  type: z.enum(['to_client', 'to_account_manager'], {
    errorMap: () => ({ message: 'Tipo de template inválido' }),
  }),
})

export type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>



