import { useState } from 'react'
import FileUpload from './components/FileUpload'
import FileList from './components/FileList'
import ClientManagement from './components/ClientManagement'
import EmailTemplateManagement from './components/EmailTemplateManagement'
import BuildInfo from './components/BuildInfo'
import { Toaster } from './components/ui/toaster'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Button } from './components/ui/button'
import { Mail } from 'lucide-react'
import { createMailtoLink } from './lib/email-service'

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadSuccess = () => {
    // Trigger file list refresh
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleTestMailto = () => {
    const testLink = createMailtoLink(
      'test@example.com',
      'Test Email Subject',
      'This is a test email body.\n\nIf you can see this, mailto links are working!'
    )
    
    // Create and click anchor element
    const link = document.createElement('a')
    link.href = testLink
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link)
      }
    }, 100)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Invoice Management</h1>
          <p className="text-muted-foreground">Manage your invoices, clients, and email templates</p>
          <div className="mt-4">
            <Button
              onClick={handleTestMailto}
              variant="outline"
              size="sm"
            >
              <Mail className="mr-2 h-4 w-4" />
              Test Mailto Link
            </Button>
          </div>
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
      <Toaster />
    </div>
  )
}

export default App
