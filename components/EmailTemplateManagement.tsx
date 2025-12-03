'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '@/lib/client/db-client'
import { EMAIL_TEMPLATE_VARIABLES } from '@/lib/email-template-variables'
import { FileText, Plus, Edit, Trash2, Info, Copy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function EmailTemplateManagement() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [newTemplate, setNewTemplate] = useState({
    subject: '',
    body: '',
    type: 'to_client',
  })
  const [templateToDelete, setTemplateToDelete] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const templatesList = await getEmailTemplates()
      setTemplates(templatesList)
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!newTemplate.subject.trim() || !newTemplate.body.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in subject and body",
        variant: "destructive",
      })
      return
    }

    // Check if a template of this type already exists
    const existingTemplate = templates.find((t: any) => t.type === newTemplate.type)
    if (existingTemplate) {
      toast({
        title: "Template Already Exists",
        description: `A template for ${newTemplate.type === 'to_client' ? 'client' : 'account manager'} already exists. Please edit the existing template instead.`,
        variant: "destructive",
      })
      return
    }

    try {
      await createEmailTemplate(newTemplate)
      toast({
        title: "Template Created",
        description: `Template for ${newTemplate.type === 'to_client' ? 'client' : 'account manager'} has been created`,
        variant: "success",
      })
      setNewTemplate({ subject: '', body: '', type: 'to_client' })
      setDialogOpen(false)
      loadTemplates()
    } catch (error) {
      console.error('Error creating template:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      })
    }
  }

  const handleEditTemplate = (template) => {
    setEditingTemplate(template)
    setNewTemplate({
      subject: template.subject,
      body: template.body,
      type: template.type,
    })
    setDialogOpen(true)
  }

  const handleUpdateTemplate = async () => {
    if (!newTemplate.subject.trim() || !newTemplate.body.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in subject and body",
        variant: "destructive",
      })
      return
    }

    try {
      await updateEmailTemplate(editingTemplate.id, newTemplate)
      toast({
        title: "Template Updated",
        description: `Template for ${newTemplate.type === 'to_client' ? 'client' : 'account manager'} has been updated`,
        variant: "success",
      })
      setNewTemplate({ subject: '', body: '', type: 'to_client' })
      setEditingTemplate(null)
      setDialogOpen(false)
      loadTemplates()
    } catch (error) {
      console.error('Error updating template:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (template) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return

    try {
      await deleteEmailTemplate(templateToDelete.id)
      toast({
        title: "Template Deleted",
        description: `${templateToDelete.type === 'to_client' ? 'Client' : 'Account Manager'} email template has been deleted`,
        variant: "success",
      })
      setTemplateToDelete(null)
      setDeleteDialogOpen(false)
      loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      })
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingTemplate(null)
    setNewTemplate({ subject: '', body: '', type: 'to_client' })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading templates...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Email Templates
            </CardTitle>
            <Button 
              onClick={() => {
                // Check if both template types already exist
                const hasClientTemplate = templates.some((t: any) => t.type === 'to_client')
                const hasAccountManagerTemplate = templates.some((t: any) => t.type === 'to_account_manager')
                
                if (hasClientTemplate && hasAccountManagerTemplate) {
                  toast({
                    title: "All Templates Created",
                    description: "Both client and account manager templates already exist. Please edit existing templates.",
                    variant: "destructive",
                  })
                  return
                }
                
                // Set default type to the one that doesn't exist
                if (!hasClientTemplate) {
                  setNewTemplate({ subject: '', body: '', type: 'to_client' })
                } else if (!hasAccountManagerTemplate) {
                  setNewTemplate({ subject: '', body: '', type: 'to_account_manager' })
                }
                
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No templates yet. Create your first email template.
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 rounded-md border bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {template.type === 'to_client' ? 'Client Email Template' : 'Account Manager Email Template'}
                      </p>
                      <p className="text-sm font-medium mt-2">Subject:</p>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                      <p className="text-sm font-medium mt-2">Body Preview:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{template.body}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(template)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Email Template' : 'Create Email Template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Update the email template' : 'Create a reusable email template using the available variables below'}
            </DialogDescription>
          </DialogHeader>
          
          {/* Available Variables Info */}
          <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Variáveis Disponíveis:</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {EMAIL_TEMPLATE_VARIABLES.map((variable) => (
                <button
                  key={variable.name}
                  type="button"
                  onClick={() => {
                    const currentField = (window as any).__currentTemplateField || 'body'
                    const fieldId = currentField === 'subject' ? 'templateSubject' : 'templateBody'
                    const field = document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement
                    
                    if (field) {
                      const start = field.selectionStart || 0
                      const end = field.selectionEnd || 0
                      const text = field.value
                      const before = text.substring(0, start)
                      const after = text.substring(end)
                      const newValue = before + variable.example + after
                      
                      field.value = newValue
                      field.focus()
                      field.setSelectionRange(start + variable.example.length, start + variable.example.length)
                      
                      if (currentField === 'subject') {
                        setNewTemplate({ ...newTemplate, subject: newValue })
                      } else {
                        setNewTemplate({ ...newTemplate, body: newValue })
                      }
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-background border rounded hover:bg-accent transition-colors group"
                  title={variable.description}
                >
                  <code className="text-primary font-mono">{variable.example}</code>
                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Clique em uma variável para inserir no corpo do email
            </p>
          </div>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateType">Type</Label>
              <select
                id="templateType"
                value={newTemplate.type}
                onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
                className="w-full p-2 border rounded-md"
                disabled={!!editingTemplate}
              >
                <option 
                  value="to_client" 
                  disabled={!editingTemplate && templates.some((t: any) => t.type === 'to_client')}
                >
                  To Client {!editingTemplate && templates.some((t: any) => t.type === 'to_client') ? '(Already exists)' : ''}
                </option>
                <option 
                  value="to_account_manager" 
                  disabled={!editingTemplate && templates.some((t: any) => t.type === 'to_account_manager')}
                >
                  To Account Manager {!editingTemplate && templates.some((t: any) => t.type === 'to_account_manager') ? '(Already exists)' : ''}
                </option>
              </select>
              {!editingTemplate && templates.some((t: any) => t.type === newTemplate.type) && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ A template of this type already exists. Please edit the existing template instead.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateSubject">Subject</Label>
              <input
                id="templateSubject"
                type="text"
                value={newTemplate.subject}
                onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                placeholder="Invoice {{invoiceName}} - Payment Due"
                className="w-full p-2 border rounded-md"
                onFocus={(e) => {
                  // Store reference to subject input for variable insertion
                  ;(window as any).__currentTemplateField = 'subject'
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateBody">Body</Label>
              <Textarea
                id="templateBody"
                value={newTemplate.body}
                onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                placeholder="Dear {{clientName}},\n\nPlease find attached invoice {{invoiceName}}.\n\nAmount: {{invoiceAmount}}\nDue Date: {{dueDate}}\n\nThank you!"
                rows={8}
                className="w-full"
                onFocus={() => {
                  // Store reference to body textarea for variable insertion
                  ;(window as any).__currentTemplateField = 'body'
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {templateToDelete?.type === 'to_client' ? 'client' : 'account manager'} email template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


