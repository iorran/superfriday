'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, GitCommit } from 'lucide-react'

export default function BuildInfo() {
  const [isLatest, setIsLatest] = useState(true)

  // Build metadata - simplified for Next.js
  const buildInfo = {
    commitSha: process.env.NEXT_PUBLIC_BUILD_COMMIT_SHA || '',
    buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString(),
    branch: process.env.NEXT_PUBLIC_BUILD_BRANCH || '',
    buildNumber: process.env.NEXT_PUBLIC_BUILD_NUMBER || '',
  }

  const shortSha = buildInfo.commitSha ? buildInfo.commitSha.substring(0, 7) : 'dev'
  const buildDate = new Date(buildInfo.buildDate)
  const formattedDate = buildDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  useEffect(() => {
    // Check if this is the latest build by comparing commit SHA
    // In production, you could call an API to check the latest deployment
    // For now, we'll assume it's latest (can be enhanced later)
    const checkLatest = async () => {
      if (process.env.NODE_ENV === 'production' && buildInfo.commitSha) {
        try {
          // You could add an API endpoint to check latest build
          // For now, we'll just mark as latest
          setIsLatest(true)
        } catch (error) {
          console.error('Error checking latest build:', error)
        }
      }
    }

    checkLatest()
  }, [buildInfo.commitSha])

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background border border-border rounded-lg p-3 shadow-lg text-xs z-10">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <GitCommit className="h-3 w-3" />
          <span className="font-mono">{shortSha}</span>
        </div>
        <span className="text-muted-foreground/50">•</span>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formattedDate}</span>
        </div>
        {isLatest && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Latest</span>
            </div>
          </>
        )}
      </div>
      {buildInfo.buildNumber && (
        <div className="mt-1 text-muted-foreground/70 text-center">
          Build #{buildInfo.buildNumber}
        </div>
      )}
    </div>
  )
}


