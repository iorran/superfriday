/**
 * Storage Client (Client-side)
 * Handles file uploads and downloads
 */

/**
 * Upload a file
 */
export async function uploadFile(
  file: File,
  clientId: string,
  invoiceAmount?: string,
  dueDate?: string
): Promise<{ fileKey: string; fileName: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('clientId', clientId)
  if (invoiceAmount) formData.append('invoiceAmount', invoiceAmount)
  if (dueDate) formData.append('dueDate', dueDate)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }))
    throw new Error(error.message || `Upload failed with status ${response.status}`)
  }

  return await response.json()
}

/**
 * Generate download link for a file
 */
export function generateDownloadLink(fileKey: string): string {
  return `/api/files/${fileKey}`
}

/**
 * Download file as blob (for client-side download)
 */
export async function downloadFileAsBlob(fileKey: string): Promise<Blob> {
  const response = await fetch(`/api/files/${fileKey}`)
  
  if (!response.ok) {
    throw new Error('Failed to download file')
  }
  
  return await response.blob()
}

