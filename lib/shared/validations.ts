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
  dailyRate: z.coerce.number().positive('Taxa diária deve ser positiva').optional(),
  poNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  vat: z.string().optional().nullable(),
  currency: z.enum(['EUR', 'GBP'], { errorMap: () => ({ message: 'Moeda inválida' }) }).optional().nullable(),
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
  client_id: z.union([z.string().min(1, 'Cliente é obrigatório'), z.null()]), // null for accountant template, string for client template
})

export type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>

// Invoice creation schema (for new invoice generation)
export const invoiceCreationSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  periodStart: z.string().min(1, 'Data de início é obrigatória'),
  periodEnd: z.string().min(1, 'Data de fim é obrigatória'),
  numberOfDays: z.coerce.number().positive('Número de dias deve ser positivo'),
  description: z.string().optional(),
  expenses: z.array(z.object({
    description: z.string().min(1, 'Descrição é obrigatória'),
    amount: z.coerce.number().min(0, 'Valor deve ser positivo ou zero'),
  })).default([]),
  orderNumber: z.string().min(1, 'Número de pedido é obrigatório'),
  invoiceNumber: z.coerce.number().int().positive('Número da invoice deve ser um número positivo'),
  invoiceDate: z.string().min(1, 'Data da invoice é obrigatória'),
  vatPercentage: z.coerce.number().min(0, 'VAT deve ser zero ou positivo').max(100, 'VAT não pode ser maior que 100%').optional(),
})

export type InvoiceCreationFormData = z.infer<typeof invoiceCreationSchema>



