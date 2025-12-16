/**
 * Storage Client (Client-side)
 * Handles file uploads and downloads
 */

/**
 * Upload a file
 */
export const uploadFile = async (file: File): Promise<{ fileKey: string; fileName: string; fileSize: number }> => {
  const formData = new FormData()
  formData.append('file', file)

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
export const generateDownloadLink = (fileKey: string): string => {
  return `/api/files/${fileKey}`
}

/**
 * Download file as blob (for client-side download)
 */
export const downloadFileAsBlob = async (fileKey: string): Promise<Blob> => {
  const response = await fetch(`/api/files/${fileKey}`)
  
  if (!response.ok) {
    throw new Error('Failed to download file')
  }
  
  return await response.blob()
}



