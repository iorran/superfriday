import { S3Client } from '@aws-sdk/client-s3'
import { useMemo } from 'react'

export const getR2Config = () => ({
  accountId: import.meta.env.VITE_R2_ACCOUNT_ID || '',
  accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
  bucketName: import.meta.env.VITE_R2_BUCKET_NAME || '',
  endpoint: `https://${import.meta.env.VITE_R2_ACCOUNT_ID || 'your-account-id'}.r2.cloudflarestorage.com`,
})

export const useR2Client = () => {
  const config = useMemo(() => getR2Config(), [])
  
  const client = useMemo(() => {
    if (!config.accessKeyId || !config.secretAccessKey) {
      return null
    }
    return new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }, [config])

  return { client, config }
}

