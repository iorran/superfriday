/**
 * Hook for PDF extraction using Veryfi API
 * Sends PDF directly to server for processing via Veryfi
 */

import { useState, useCallback } from 'react'
import type { ExtractedPDFData } from '@/types'

interface UsePDFExtractionResult {
  extractFromFile: (file: File) => Promise<ExtractedPDFData | null>
  isExtracting: boolean
  error: string | null
}

export const usePDFExtraction = (): UsePDFExtractionResult => {
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractFromFile = useCallback(async (file: File): Promise<ExtractedPDFData | null> => {
    setIsExtracting(true)
    setError(null)

    try {
      // Validate file type
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('File must be a PDF')
      }

      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // Call API
      const response = await fetch('/api/pdf/extract', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to extract PDF data' }))
        throw new Error(errorData.message || 'Failed to extract PDF data')
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.message || 'Failed to extract PDF data')
      }

      // If there's a warning, log it but don't throw an error
      if (result.warning) {
        console.warn('PDF extraction warning:', result.warning)
      }

      return result.data as ExtractedPDFData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract PDF data'
      setError(errorMessage)
      console.error('PDF extraction error:', err)
      return null
    } finally {
      setIsExtracting(false)
    }
  }, [])

  return {
    extractFromFile,
    isExtracting,
    error,
  }
}




