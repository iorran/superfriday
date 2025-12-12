/**
 * Clients API Route
 * Handles client CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from '@/lib/server/db-operations'
import { requireAuth } from '@/lib/server/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('id')

    if (clientId) {
      const client = await getClient(clientId, userId)
      if (!client) {
        return NextResponse.json(
          { error: true, message: 'Client not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(client)
    }

    const clients = await getClients(userId)
    return NextResponse.json(clients)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error fetching clients:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch clients'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const id = await createClient(body, userId)
    return NextResponse.json({ id })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error creating client:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create client'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: true, message: 'Client ID is required' },
        { status: 400 }
      )
    }

    await updateClient(id, updates, userId)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error updating client:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update client'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('id')

    if (!clientId) {
      return NextResponse.json(
        { error: true, message: 'Client ID is required' },
        { status: 400 }
      )
    }

    await deleteClient(clientId, userId)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: true, message: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Error deleting client:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete client'
    return NextResponse.json(
      { error: true, message: errorMessage },
      { status: 500 }
    )
  }
}

