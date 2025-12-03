'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to clients page by default
    router.replace('/settings/clients')
  }, [router])

  return null
}

