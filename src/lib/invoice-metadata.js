import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const METADATA_FILE_KEY = '_invoices-metadata.json'

/**
 * Invoice workflow states
 */
export const InvoiceState = {
  CREATED: 'created',
  SENT_TO_CLIENT: 'sent_to_client',
  PAYMENT_RECEIVED: 'payment_received',
  SENT_TO_ACCOUNT_MANAGER: 'sent_to_account_manager',
}

/**
 * Get invoice metadata from R2 (internal use)
 */
const getInvoiceMetadata = async (client, bucketName) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: METADATA_FILE_KEY,
    })

    const response = await client.send(command)
    const bodyString = await response.Body.transformToString()
    return JSON.parse(bodyString)
  } catch (error) {
    // If file doesn't exist, return empty object
    if (error.name === 'NoSuchKey') {
      return {}
    }
    throw error
  }
}

/**
 * Save invoice metadata to R2 (internal use)
 */
const saveInvoiceMetadata = async (client, bucketName, metadata) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: METADATA_FILE_KEY,
    Body: JSON.stringify(metadata, null, 2),
    ContentType: 'application/json',
  })

  await client.send(command)
}

/**
 * Update invoice state
 */
export const updateInvoiceState = async (client, bucketName, fileKey, updates) => {
  const metadata = await getInvoiceMetadata(client, bucketName)
  
  if (!metadata[fileKey]) {
    metadata[fileKey] = {
      sentToClient: false,
      sentToClientAt: null,
      paymentReceived: false,
      paymentReceivedAt: null,
      sentToAccountManager: false,
      sentToAccountManagerAt: null,
    }
  }

  // Update fields
  Object.assign(metadata[fileKey], updates)

  // Set timestamps for state changes
  if (updates.sentToClient && !metadata[fileKey].sentToClientAt) {
    metadata[fileKey].sentToClientAt = new Date().toISOString()
  }
  if (updates.paymentReceived && !metadata[fileKey].paymentReceivedAt) {
    metadata[fileKey].paymentReceivedAt = new Date().toISOString()
  }
  if (updates.sentToAccountManager && !metadata[fileKey].sentToAccountManagerAt) {
    metadata[fileKey].sentToAccountManagerAt = new Date().toISOString()
  }

  await saveInvoiceMetadata(client, bucketName, metadata)
  return metadata[fileKey]
}

/**
 * Get invoice state for a file
 */
export const getInvoiceState = async (client, bucketName, fileKey) => {
  const metadata = await getInvoiceMetadata(client, bucketName)
  return metadata[fileKey] || {
    sentToClient: false,
    sentToClientAt: null,
    paymentReceived: false,
    paymentReceivedAt: null,
    sentToAccountManager: false,
    sentToAccountManagerAt: null,
  }
}

/**
 * Get all invoices with their states
 */
export const getAllInvoiceStates = async (client, bucketName) => {
  return await getInvoiceMetadata(client, bucketName)
}

/**
 * Delete invoice metadata for a file
 */
export const deleteInvoiceMetadata = async (client, bucketName, fileKey) => {
  const metadata = await getInvoiceMetadata(client, bucketName)
  delete metadata[fileKey]
  await saveInvoiceMetadata(client, bucketName, metadata)
}

