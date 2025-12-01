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
import { sendEmailWithTemplate, getTemplateVariables } from '../lib/email-service'
import { Loader2 } from 'lucide-react'

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
  const [sending, setSending] = useState(false)
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
      setPreview({
        subject: replaceVariables(selectedTemplate.subject, variables),
        body: replaceVariables(selectedTemplate.body, variables),
      })
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


  const handleSend = async () => {
    if (!selectedTemplate || !client?.email) {
      toast({
        title: "Error",
        description: "Please select a template and ensure client email is set",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      const variables = getTemplateVariables(invoice, client)
      
      // Send email
      await sendEmailWithTemplate(selectedTemplate, variables, {
        email: client.email,
        name: client.name,
      })

      // Record in history
      await recordEmail({
        invoiceFileKey: invoice.file_key,
        templateId: selectedTemplate.id,
        recipientEmail: client.email,
        recipientName: client.name,
        subject: preview.subject,
        body: preview.body,
        status: 'sent',
      })

      toast({
        title: "Email Sent",
        description: `Email sent successfully to ${client.email}`,
        variant: "success",
      })

      if (onSuccess) {
        onSuccess()
      }

      onOpenChange(false)
    } catch (error) {
      console.error('Error sending email:', error)
      
      // Record failed attempt
      try {
        await recordEmail({
          invoiceFileKey: invoice.file_key,
          templateId: selectedTemplate.id,
          recipientEmail: client.email,
          recipientName: client.name,
          subject: preview.subject,
          body: preview.body,
          status: 'failed',
          errorMessage: error.message,
        })
      } catch (recordError) {
        console.error('Error recording email:', recordError)
      }

      toast({
        title: "Send Failed",
        description: error.message || "Failed to send email",
        variant: "destructive",
      })
    } finally {
      setSending(false)
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !selectedTemplate}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Email'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EmailDialog

