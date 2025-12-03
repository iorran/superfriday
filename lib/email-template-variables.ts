/**
 * Available email template variables
 * Update this file when adding or removing template variables
 */

export const EMAIL_TEMPLATE_VARIABLES = [
  { name: 'clientName', description: 'Nome do cliente', example: '{{clientName}}' },
  { name: 'invoiceName', description: 'Nome/ID da invoice', example: '{{invoiceName}}' },
  { name: 'invoiceAmount', description: 'Valor da invoice', example: '{{invoiceAmount}}' },
  { name: 'dueDate', description: 'Data de vencimento', example: '{{dueDate}}' },
  { name: 'downloadLink', description: 'Link para download do arquivo', example: '{{downloadLink}}' },
] as const

export type EmailTemplateVariable = typeof EMAIL_TEMPLATE_VARIABLES[number]['name']

