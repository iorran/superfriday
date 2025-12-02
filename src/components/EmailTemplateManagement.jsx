import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button.jsx'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'
import { getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '../lib/d1-client'
import { FileText, Plus, Edit, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'

const EmailTemplateManagement = () => {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
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
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.body.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      await createEmailTemplate(newTemplate)
      toast({
        title: "Template Created",
        description: `${newTemplate.name} has been created`,
        variant: "success",
      })
      setNewTemplate({ name: '', subject: '', body: '', type: 'to_client' })
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
      name: template.name,
      subject: template.subject,
      body: template.body,
      type: template.type,
    })
    setDialogOpen(true)
  }

  const handleUpdateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.subject.trim() || !newTemplate.body.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      await updateEmailTemplate(editingTemplate.id, newTemplate)
      toast({
        title: "Template Updated",
        description: `${newTemplate.name} has been updated`,
        variant: "success",
      })
      setNewTemplate({ name: '', subject: '', body: '', type: 'to_client' })
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
        description: `${templateToDelete.name} has been deleted`,
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
    setNewTemplate({ name: '', subject: '', body: '', type: 'to_client' })
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
            <Button onClick={() => setDialogOpen(true)}>
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
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Type: {template.type === 'to_client' ? 'To Client' : 'To Account Manager'}
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
              {editingTemplate ? 'Update the email template' : `Create a reusable email template. Use variables like {{clientName}}, {{invoiceName}}, {{invoiceAmount}}, {{dueDate}}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <input
                id="templateName"
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Invoice to Client"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateType">Type</Label>
              <select
                id="templateType"
                value={newTemplate.type}
                onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="to_client">To Client</option>
                <option value="to_account_manager">To Account Manager</option>
              </select>
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
              This will permanently delete the template "{templateToDelete?.name}". This action cannot be undone.
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

export default EmailTemplateManagement

