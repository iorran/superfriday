/**
 * Storage Client (Client-side)
 * Handles file uploads and downloads
 */

/**
 * Upload a file
 */
export const uploadFile = async (file: File, clientId?: string): Promise<{ fileKey: string; fileName: string; fileSize: number }> => {
  const formData = new FormData()
  formData.append('file', file)
  if (clientId) {
    formData.append('clientId', clientId)
  }

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




