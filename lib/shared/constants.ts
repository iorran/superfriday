/**
 * Shared constants
 * Constants used across client and server code
 */

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
  { name: 'monthYear', description: 'Month and year formatted (e.g., January 2024)', example: '{{monthYear}}' },
  { name: 'downloadLink', description: 'Link para download do arquivo', example: '{{downloadLink}}' },
  { name: 'currentDate', description: 'Data atual (ex: 30/01/2026)', example: '{{currentDate}}' },
  { name: 'clientVat', description: 'Número de registro/VAT do cliente', example: '{{clientVat}}' },
  { name: 'clientAddress', description: 'Endereço completo do cliente', example: '{{clientAddress}}' },
] as const

/**
 * Month names in English
 */
export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const

/**
 * Short month names
 */
export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const




