/**
 * Draft Management Utilities
 * Handles saving and loading invoice drafts from localStorage
 */

import type { InvoiceDraft, ExtractedPDFData } from '@/types'

const DRAFT_PREFIX = 'invoice_draft_'
const DRAFT_EXPIRY_DAYS = 7

export interface DraftFormData {
  clientId: string
  invoiceAmount: number
  dueDate: string
  month: number
  year: number
  notes?: string | null
}

export interface DraftFile {
  fileKey: string
  fileType: 'invoice' | 'timesheet'
  originalName: string
  fileSize: number
}

/**
 * Generate a unique draft ID
 */
function generateDraftId(): string {
  return `${DRAFT_PREFIX}${Date.now()}`
}

/**
 * Get all draft keys from localStorage
 */
function getAllDraftKeys(): string[] {
  if (typeof window === 'undefined') return []
  
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(DRAFT_PREFIX)) {
      keys.push(key)
    }
  }
  return keys
}

/**
 * Save a draft to localStorage
 */
export function saveDraft(
  formData: DraftFormData,
  files: DraftFile[],
  step: number = 1,
  extractedData?: ExtractedPDFData,
  draftId?: string
): string {
  if (typeof window === 'undefined') {
    throw new Error('localStorage is not available')
  }

  const id = draftId || generateDraftId()
  const now = new Date().toISOString()

  const draft: InvoiceDraft = {
    id,
    createdAt: draftId ? (getDraft(id)?.createdAt || now) : now,
    updatedAt: now,
    step,
    formData,
    files,
    extractedData,
  }

  try {
    localStorage.setItem(id, JSON.stringify(draft))
    return id
  } catch (error) {
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Clean up old drafts and try again
      cleanupOldDrafts()
      localStorage.setItem(id, JSON.stringify(draft))
      return id
    }
    throw error
  }
}

/**
 * Load a draft by ID
 */
export function getDraft(draftId: string): InvoiceDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(draftId)
    if (!data) return null

    const draft = JSON.parse(data) as InvoiceDraft
    
    // Check if draft is expired
    const createdAt = new Date(draft.createdAt)
    const expiryDate = new Date(createdAt.getTime() + DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    
    if (new Date() > expiryDate) {
      deleteDraft(draftId)
      return null
    }

      return draft
    } catch (err) {
      console.error('Error loading draft:', err)
      return null
    }
}

/**
 * Get all drafts
 */
export function getAllDrafts(): InvoiceDraft[] {
  if (typeof window === 'undefined') return []

  const keys = getAllDraftKeys()
  const drafts: InvoiceDraft[] = []

  for (const key of keys) {
    const draft = getDraft(key)
    if (draft) {
      drafts.push(draft)
    }
  }

  // Sort by updatedAt descending (most recent first)
  return drafts.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

/**
 * Delete a draft
 */
export function deleteDraft(draftId: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(draftId)
  } catch (error) {
    console.error('Error deleting draft:', error)
  }
}

/**
 * Clean up old drafts (older than expiry days)
 */
export function cleanupOldDrafts(): number {
  if (typeof window === 'undefined') return 0

  const keys = getAllDraftKeys()
  let cleaned = 0
  const now = new Date()

  for (const key of keys) {
    try {
      const data = localStorage.getItem(key)
      if (!data) continue

      const draft = JSON.parse(data) as InvoiceDraft
      const createdAt = new Date(draft.createdAt)
      const expiryDate = new Date(createdAt.getTime() + DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

      if (now > expiryDate) {
        localStorage.removeItem(key)
        cleaned++
      }
    } catch {
      // If we can't parse it, remove it
      localStorage.removeItem(key)
      cleaned++
    }
  }

  return cleaned
}

/**
 * Clear all drafts
 */
export function clearAllDrafts(): void {
  if (typeof window === 'undefined') return

  const keys = getAllDraftKeys()
  for (const key of keys) {
    localStorage.removeItem(key)
  }
}

/**
 * Get storage usage info
 */
export function getDraftStorageInfo(): { count: number; totalSize: number } {
  if (typeof window === 'undefined') return { count: 0, totalSize: 0 }

  const keys = getAllDraftKeys()
  let totalSize = 0

  for (const key of keys) {
    const data = localStorage.getItem(key)
    if (data) {
      totalSize += new Blob([data]).size
    }
  }

  return {
    count: keys.length,
    totalSize,
  }
}

// Clean up old drafts on module load
if (typeof window !== 'undefined') {
  cleanupOldDrafts()
}

