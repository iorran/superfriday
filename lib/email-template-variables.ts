/**
 * Available email template variables
 * Update this file when adding or removing template variables
 */

export const EMAIL_TEMPLATE_VARIABLES = [
  { name: 'clientName', description: 'Nome do cliente', example: '{{clientName}}' },
  { name: 'invoiceName', description: 'Nome/ID da invoice', example: '{{invoiceName}}' },
  { name: 'invoiceAmount', description: 'Valor da invoice', example: '{{invoiceAmount}}' },
  { name: 'month', description: 'Mês da invoice (número)', example: '{{month}}' },
  { name: 'year', description: 'Ano da invoice', example: '{{year}}' },
  { name: 'monthYear', description: 'Mês e ano formatado (ex: Janeiro 2024)', example: '{{monthYear}}' },
  { name: 'downloadLink', description: 'Link para download do arquivo', example: '{{downloadLink}}' },
] as const

