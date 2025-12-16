/**
 * PDF Generator
 * Generates invoice PDFs using pdfkit matching the exact template design
 */

import PDFDocument from 'pdfkit'
import { getSetting } from './db-operations'

interface UserInfo {
  companyName: string
  address: string
  vat: string
  bankAccount: string
  iban: string
  bankAccountName: string
  vatPercentage?: number
}

interface InvoiceData {
  clientId: string
  clientName: string
  clientAddress: string
  clientVat: string
  periodStart: string
  periodEnd: string
  numberOfDays: number
  dailyRate: number
  description?: string
  poNumber?: string | null
  expenses: Array<{ description: string; amount: number }>
  netServiceCharge: number
  netInvoice: number
  grossInvoice: number
  invoiceNumber: string
  invoiceDate: string
  orderNumber: string
  currency?: string
}

/**
 * Get user information from settings
 */
export const getUserInfo = async (userId: string): Promise<UserInfo | null> => {
  const [companyName, address, vat, bankAccount, iban, bankAccountName, vatPercentageStr] = await Promise.all([
    getSetting('user_company_name', userId),
    getSetting('user_address', userId),
    getSetting('user_vat', userId),
    getSetting('user_bank_account', userId),
    getSetting('user_iban', userId),
    getSetting('user_bank_account_name', userId),
    getSetting('user_vat_percentage', userId),
  ])

  if (!companyName || !address || !vat || !bankAccount || !iban || !bankAccountName) {
    return null
  }

  const vatPercentage = vatPercentageStr ? parseFloat(vatPercentageStr) : 0

  return {
    companyName,
    address,
    vat,
    bankAccount,
    iban,
    bankAccountName,
    vatPercentage,
  }
}

/**
 * Format date to DD/MM/YYYY
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Format currency with proper spacing (e.g., "€ 12 696,00" or "£ 12 696,00")
 */
const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  const formatted = amount.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const symbol = currency === 'GBP' ? '£' : '€'
  return `${symbol} ${formatted}`
}

/**
 * Generate PDF invoice matching exact template layout
 */
export const generateInvoicePDF = async (
  invoiceData: InvoiceData,
  userInfo: UserInfo,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const buffers: Buffer[] = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Page dimensions
      const pageWidth = doc.page.width
      const margin = 50
      const contentWidth = pageWidth - (margin * 2)

      // Font sizes (matching template)
      const titleFontSize = 18 // Reduced from 24
      const standardFontSize = 10
      const companyNameFontSize = 14 // Increased for company name

      // ===== TOP SECTION: USER INFORMATION (Centered) =====
      let userInfoY = margin

      // Company Name (larger, bold, centered)
      doc.fontSize(companyNameFontSize)
        .font('Helvetica-Bold')
        .text(userInfo.companyName, margin, userInfoY, {
          width: contentWidth,
          align: 'center',
        })
      
      userInfoY = doc.y + 5

      // Address (centered, italic)
      doc.fontSize(standardFontSize)
        .font('Helvetica-Oblique') // Italic
        .text(userInfo.address, margin, userInfoY, {
          width: contentWidth,
          align: 'center',
        })
      
      userInfoY = doc.y + 5

      // Financial details - one line each, centered, italic
      doc.fontSize(standardFontSize)
        .font('Helvetica-Oblique') // Italic
        .text(`VAT: ${userInfo.vat}`, margin, userInfoY, {
          width: contentWidth,
          align: 'center',
        })
      
      userInfoY = doc.y + 3
      
      doc.text(`Bank Account: ${userInfo.bankAccount}`, margin, userInfoY, {
        width: contentWidth,
        align: 'center',
      })
      
      userInfoY = doc.y + 3
      
      doc.text(`IBAN: ${userInfo.iban}`, margin, userInfoY, {
        width: contentWidth,
        align: 'center',
      })
      
      userInfoY = doc.y + 3
      
      doc.text(`Name Bank Account: ${userInfo.bankAccountName}`, margin, userInfoY, {
        width: contentWidth,
        align: 'center',
      })

      // ===== INVOICE TITLE (Centered) =====
      const titleY = userInfoY + 20
      doc.fontSize(titleFontSize)
        .font('Helvetica-Bold')
        .text('Invoice', margin, titleY, {
          width: contentWidth,
          align: 'center',
        })

      // ===== CLIENT INFORMATION (Top Left) =====
      const clientY = titleY + 35
      doc.fontSize(standardFontSize)
        .font('Helvetica')
        .text(invoiceData.clientName, margin, clientY)
      
      let currentClientY = doc.y + 3

      // Client address (split by lines if multi-line, or by commas)
      if (invoiceData.clientAddress) {
        // Try splitting by newlines first, then by commas if no newlines
        let addressLines = invoiceData.clientAddress.split('\n').filter(line => line.trim())
        if (addressLines.length === 1) {
          // If single line, try splitting by comma
          addressLines = invoiceData.clientAddress.split(',').map(line => line.trim()).filter(line => line)
        }
        addressLines.forEach((line) => {
          doc.text(line, margin, currentClientY)
          currentClientY = doc.y + 3
        })
      }

      // Client VAT
      if (invoiceData.clientVat) {
        doc.text(`VAT No: ${invoiceData.clientVat}`, margin, currentClientY)
        currentClientY = doc.y + 3
      }

      // ===== HEADER BAR (Order no, Invoice Number, Invoice Date) =====
      const headerBarY = currentClientY + 10
      const headerBarHeight = 25
      
      // Draw header bar background (light grey)
      doc.rect(margin, headerBarY, contentWidth, headerBarHeight)
        .fillColor('#F5F5F5')
        .fill()
        .fillColor('#000000') // Reset to black

      // All on same line: Order no (left), Invoice Number (center), Invoice Date (right)
      // Format: "Label: value" with labels bold, values normal
      const headerY = headerBarY + 8
      
      doc.fontSize(standardFontSize)
      
      // Order no (left) - "Order no.: value"
      const orderNoLabel = 'Order no.: '
      const orderNoX = margin + 10
      doc.font('Helvetica-Bold')
      const orderNoLabelWidth = doc.widthOfString(orderNoLabel)
      doc.text(orderNoLabel, orderNoX, headerY)
      doc.font('Helvetica')
      doc.text(invoiceData.orderNumber, orderNoX + orderNoLabelWidth, headerY)

      // Invoice Number (center) - "Invoice Number: value"
      const invoiceNumberLabel = 'Invoice Number: '
      doc.font('Helvetica-Bold')
      const invoiceNumberLabelWidth = doc.widthOfString(invoiceNumberLabel)
      doc.font('Helvetica')
      const invoiceNumberValueWidth = doc.widthOfString(invoiceData.invoiceNumber)
      const invoiceNumberTotalWidth = invoiceNumberLabelWidth + invoiceNumberValueWidth
      const invoiceNumberX = (pageWidth - invoiceNumberTotalWidth) / 2
      doc.font('Helvetica-Bold')
        .text(invoiceNumberLabel, invoiceNumberX, headerY)
      doc.font('Helvetica')
        .text(invoiceData.invoiceNumber, invoiceNumberX + invoiceNumberLabelWidth, headerY)

      // Invoice Date (right) - "Invoice Date: value"
      const invoiceDateLabel = 'Invoice Date: '
      const invoiceDateValue = formatDate(invoiceData.invoiceDate)
      doc.font('Helvetica-Bold')
      const invoiceDateLabelWidth = doc.widthOfString(invoiceDateLabel)
      doc.font('Helvetica')
      const invoiceDateValueWidth = doc.widthOfString(invoiceDateValue)
      const invoiceDateTotalWidth = invoiceDateLabelWidth + invoiceDateValueWidth
      const invoiceDateX = pageWidth - margin - 10 - invoiceDateTotalWidth
      doc.font('Helvetica-Bold')
        .text(invoiceDateLabel, invoiceDateX, headerY)
      doc.font('Helvetica')
        .text(invoiceDateValue, invoiceDateX + invoiceDateLabelWidth, headerY)

      // ===== MAIN CONTENT AREA (Bordered Box) =====
      const contentBoxY = headerBarY + headerBarHeight + 15
      const contentBoxHeight = 330
      const contentBoxPadding = 15
      const leftColumnX = margin + contentBoxPadding
      const rightColumnWidth = 180
      const rightColumnX = pageWidth - margin - contentBoxPadding - rightColumnWidth

      // Draw border
      doc.rect(margin, contentBoxY, contentWidth, contentBoxHeight)
        .strokeColor('#000000')
        .lineWidth(1)
        .stroke()

      let currentContentY = contentBoxY + contentBoxPadding

      // Description (optional, bold label with empty line)
      if (invoiceData.description) {
        doc.fontSize(standardFontSize)
          .font('Helvetica-Bold')
          .text('Description:', leftColumnX, currentContentY)
        currentContentY = doc.y + 8
        doc.font('Helvetica')
          .text(invoiceData.description, leftColumnX, currentContentY, {
            width: contentWidth - (contentBoxPadding * 2),
          })
        currentContentY = doc.y + 10
      } else {
        // Show Description label even if empty
        doc.fontSize(standardFontSize)
          .font('Helvetica-Bold')
          .text('Description:', leftColumnX, currentContentY)
        currentContentY = doc.y + 10
      }

      // PO Number (if set, bold label)
      if (invoiceData.poNumber) {
        doc.fontSize(standardFontSize)
          .font('Helvetica-Bold')
          .text('PO Number', leftColumnX, currentContentY)
        doc.font('Helvetica')
          .text(`(${invoiceData.poNumber})`, rightColumnX, currentContentY, {
            width: rightColumnWidth,
            align: 'right',
          })
        currentContentY = doc.y + 10
      }

      // Period of Invoice (bold label)
      doc.fontSize(standardFontSize)
        .font('Helvetica-Bold')
        .text('Period of Invoice', leftColumnX, currentContentY)
      doc.font('Helvetica')
        .text(
          `(${formatDate(invoiceData.periodStart)} - ${formatDate(invoiceData.periodEnd)})`,
          rightColumnX,
          currentContentY,
          {
            width: rightColumnWidth,
            align: 'right',
          }
        )
      currentContentY = doc.y + 15

      // Service section (bold label)
      doc.fontSize(standardFontSize)
        .font('Helvetica-Bold')
        .text('Service', leftColumnX, currentContentY)
      currentContentY = doc.y + 10

      // Number of (hours/days) - indented
      doc.font('Helvetica')
        .text('Number of (hours/days)', leftColumnX + 20, currentContentY)
        .text(
          invoiceData.numberOfDays.toFixed(2),
          rightColumnX,
          currentContentY,
          {
            width: rightColumnWidth,
            align: 'right',
          }
        )
      currentContentY = doc.y + 10

      // Rate (Per hour/day) - indented
      doc.text('Rate (Per hour/day)', leftColumnX + 20, currentContentY)
        .text(
          formatCurrency(invoiceData.dailyRate, invoiceData.currency),
          rightColumnX,
          currentContentY,
          {
            width: rightColumnWidth,
            align: 'right',
          }
        )
      currentContentY = doc.y + 10

      // Net Service Charge - indented, bold
      doc.font('Helvetica-Bold')
        .text('Net Service Charge', leftColumnX + 20, currentContentY)
        .text(
          formatCurrency(invoiceData.netServiceCharge, invoiceData.currency),
          rightColumnX,
          currentContentY,
          {
            width: rightColumnWidth,
            align: 'right',
          }
        )
      currentContentY = doc.y + 15

      // Expenses section (only show if expenses exist)
      if (invoiceData.expenses.length > 0) {
        doc.font('Helvetica-Bold')
          .text('Expenses', leftColumnX, currentContentY)
        currentContentY = doc.y + 10

        // List expenses - indented, with labels like "Expense 1", "Expense 2", etc.
        invoiceData.expenses.forEach((expense, index) => {
          const expenseLabel = expense.description || `Expense ${index + 1}`
          doc.font('Helvetica')
            .text(expenseLabel, leftColumnX + 20, currentContentY)
            .text(
              formatCurrency(expense.amount, invoiceData.currency),
              rightColumnX,
              currentContentY,
              {
                width: rightColumnWidth,
                align: 'right',
              }
            )
          currentContentY = doc.y + 10
        })
        currentContentY += 5
      }

      // Net Invoice (bold)
      doc.font('Helvetica-Bold')
        .text('Net Invoice', leftColumnX, currentContentY)
        .text(
          formatCurrency(invoiceData.netInvoice, invoiceData.currency),
          rightColumnX,
          currentContentY,
          {
            width: rightColumnWidth,
            align: 'right',
          }
        )
      currentContentY = doc.y + 10

      // VAT line (always show, even if 0%)
      const vatPercentage = userInfo.vatPercentage || 0
      const vatAmount = invoiceData.netInvoice * (vatPercentage / 100)
      doc.font('Helvetica')
        .text(`VAT @ ${vatPercentage}%`, leftColumnX, currentContentY)
        .text(
          formatCurrency(vatAmount, invoiceData.currency),
          rightColumnX,
          currentContentY,
          {
            width: rightColumnWidth,
            align: 'right',
          }
        )
      currentContentY = doc.y + 10

      // Gross Invoice (bold) - calculated as Net Invoice * (1 + VAT percentage)
      const calculatedGrossInvoice = invoiceData.netInvoice * (1 + (vatPercentage / 100))
      doc.font('Helvetica-Bold')
        .text('Gross Invoice', leftColumnX, currentContentY)
        .text(
          formatCurrency(calculatedGrossInvoice, invoiceData.currency),
          rightColumnX,
          currentContentY,
          {
            width: rightColumnWidth,
            align: 'right',
          }
        )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
