'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import FileList from '@/components/FileList'
import ClientManagement from '@/components/ClientManagement'
import EmailTemplateManagement from '@/components/EmailTemplateManagement'
import BuildInfo from '@/components/BuildInfo'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadSuccess = () => {
    // Trigger file list refresh
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Invoice Management</h1>
          <p className="text-muted-foreground">Manage your invoices, clients, and email templates</p>
        </div>

        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <FileList refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="flex flex-col items-center">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <ClientManagement />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <EmailTemplateManagement />
          </TabsContent>
        </Tabs>
      </div>
      <BuildInfo />
    </div>
  )
}

