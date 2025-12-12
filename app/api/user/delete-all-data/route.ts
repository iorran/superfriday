/**
 * Delete All User Data API Route
 * Deletes all invoices, files, clients, and other user data
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getDatabase } from '@/lib/db'
import { deleteFile } from '@/lib/storage'

/**
 * DELETE /api/user/delete-all-data
 * Delete all data for the authenticated user
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id
    const db = await getDatabase()

    // Get all invoice files to delete from blob storage
    const invoiceFiles = await db.collection('invoice_files').find({ user_id: userId }).toArray()
    
    // Delete all files from blob storage
    const deletePromises = invoiceFiles.map(async (file) => {
      if (file.file_key) {
        try {
          await deleteFile(file.file_key)
        } catch (error) {
          // Log but don't fail if file deletion fails (file might not exist)
          console.warn(`Failed to delete file ${file.file_key}:`, error)
        }
      }
    })
    await Promise.all(deletePromises)

    // Delete all database collections for the user
    await Promise.all([
      db.collection('invoice_files').deleteMany({ user_id: userId }),
      db.collection('email_history').deleteMany({ user_id: userId }),
      db.collection('invoices').deleteMany({ user_id: userId }),
      db.collection('clients').deleteMany({ user_id: userId }),
      db.collection('email_templates').deleteMany({ user_id: userId }),
      db.collection('email_accounts').deleteMany({ user_id: userId }),
      db.collection('settings').deleteMany({ user_id: userId }),
      db.collection('user_preferences').deleteMany({ user_id: userId }),
      db.collection('smtp_settings').deleteMany({ user_id: userId }),
      db.collection('google_oauth_tokens').deleteMany({ user_id: userId }),
    ])

    return NextResponse.json({
      success: true,
      message: 'All user data deleted successfully',
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting all user data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete user data'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

