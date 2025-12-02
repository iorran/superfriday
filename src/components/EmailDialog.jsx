import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { useToast } from './ui/use-toast'
import { getEmailTemplates, getEmailTemplate, recordEmail } from '../lib/d1-client'
import { getTemplateVariables, createMailtoLink } from '../lib/email-service'
import { Mail } from 'lucide-react'

const replaceVariables = (template, variables) => {
  let result = template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  })
  return result
}

const EmailDialog = ({ open, onOpenChange, invoice, client, onSuccess }) => {
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [preview, setPreview] = useState({ subject: '', body: '' })
  const [mailtoLink, setMailtoLink] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplate(selectedTemplateId)
    }
  }, [selectedTemplateId])

  useEffect(() => {
    if (selectedTemplate && invoice && client) {
      const variables = getTemplateVariables(invoice, client)
      const subject = replaceVariables(selectedTemplate.subject, variables)
      const body = replaceVariables(selectedTemplate.body, variables)
      setPreview({ subject, body })
      setMailtoLink(createMailtoLink(client.email, subject, body))
    }
  }, [selectedTemplate, invoice, client])

  const loadTemplates = async () => {
    try {
      const templatesList = await getEmailTemplates()
      setTemplates(templatesList)
      
      // Auto-select "to_client" template if sending to client
      const clientTemplate = templatesList.find(t => t.type === 'to_client')
      if (clientTemplate) {
        setSelectedTemplateId(clientTemplate.id)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      })
    }
  }

  const loadTemplate = async (templateId) => {
    try {
      const template = await getEmailTemplate(templateId)
      setSelectedTemplate(template)
    } catch (error) {
      console.error('Error loading template:', error)
    }
  }


  const handleOpenEmail = async () => {
    if (!selectedTemplate || !client?.email || !mailtoLink) {
      toast({
        title: "Error",
        description: "Please select a template and ensure client email is set",
        variant: "destructive",
      })
      return
    }

    try {
      // Record email opened in history
      await recordEmail({
        invoiceFileKey: invoice.file_key,
        templateId: selectedTemplate.id,
        recipientEmail: client.email,
        recipientName: client.name,
        subject: preview.subject,
        body: preview.body,
        status: 'opened',
      })

      // Create a temporary anchor element and click it
      // This is more reliable than window.location.href
      const link = document.createElement('a')
      link.href = mailtoLink
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      
      // Clean up after a short delay
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
      }, 100)

      toast({
        title: "Email Client Opened",
        description: `Opening email client for ${client.email}`,
        variant: "default",
      })

      if (onSuccess) {
        onSuccess()
      }

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false)
      }, 500)
    } catch (error) {
      console.error('Error opening email:', error)
      toast({
        title: "Error",
        description: "Failed to open email client",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            Send invoice email to {client?.name || 'client'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template">Email Template</Label>
            <select
              id="template"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {preview.subject && (
            <>
              <div className="space-y-2">
                <Label>Subject</Label>
                <div className="p-3 bg-muted rounded-md">
                  {preview.subject}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Body Preview</Label>
                <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {preview.body}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Recipient</Label>
            <div className="p-3 bg-muted rounded-md">
              {client?.name} &lt;{client?.email}&gt;
            </div>
          </div>

          {mailtoLink && (
            <div className="space-y-2">
              <Label>Email Link</Label>
              <div className="flex gap-2">
                <a
                  href={mailtoLink}
                  className="flex-1 p-3 bg-muted rounded-md text-sm text-blue-600 hover:text-blue-800 underline break-all"
                  onClick={(e) => {
                    e.preventDefault()
                    handleOpenEmail()
                  }}
                >
                  {mailtoLink.substring(0, 80)}...
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(mailtoLink)
                    toast({
                      title: "Copied",
                      description: "Mailto link copied to clipboard",
                    })
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleOpenEmail}
            disabled={!selectedTemplate || !mailtoLink}
          >
            <Mail className="mr-2 h-4 w-4" />
            Open Email Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EmailDialog

