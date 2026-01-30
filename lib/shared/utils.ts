import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { MONTH_NAMES_SHORT } from "./constants"

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

/**
 * Format currency with locale pt-PT
 * Supports EUR and GBP currencies
 */
export const formatCurrency = (amount: number | null | undefined, currency: string = 'EUR'): string => {
  if (amount === null || amount === undefined) {
    const symbol = currency === 'GBP' ? '£' : '€'
    return `${symbol}0,00`
  }
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency === 'GBP' ? 'GBP' : 'EUR',
  }).format(amount)
}

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Format date string to DD/MM/YYYY format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Get current date formatted as DD/MM/YYYY
 */
export const formatCurrentDate = (): string => {
  return new Date().toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format invoice date with month name (e.g., "1 Jan 2024")
 */
export const formatInvoiceDate = (month: number | null, year: number | null, uploadedAt?: string): string => {
  if (!month || !year) return ''

  const monthName = MONTH_NAMES_SHORT[month - 1] || String(month)

  let day = 1
  if (uploadedAt) {
    try {
      const date = new Date(uploadedAt)
      if (!isNaN(date.getTime())) {
        day = date.getDate()
      }
    } catch {
      // Use default day 1
    }
  }

  return `${day} ${monthName} ${year}`
}




