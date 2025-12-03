'use client'

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate } from '@/lib/hooks/use-email-templates'
import { EMAIL_TEMPLATE_VARIABLES } from '@/lib/email-template-variables'
import { FileText, Plus, Edit, Trash2, Info, Copy } from 'lucide-react'
import type { EmailTemplate, WindowWithTemplateField } from '@/types'
import { emailTemplateSchema, type EmailTemplateFormData } from '@/lib/validations'
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
  const { data: templates = [], isLoading: loading } = useEmailTemplates()
  const createTemplateMutation = useCreateEmailTemplate()
  const updateTemplateMutation = useUpdateEmailTemplate()
  const deleteTemplateMutation = useDeleteEmailTemplate()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null)
  const { toast } = useToast()

  const form = useForm<EmailTemplateFormData>({
    defaultValues: {
      subject: '',
      body: '',
      type: 'to_client',
    },
    validators: {
      onSubmit: emailTemplateSchema,
    },
    onSubmit: async ({ value }) => {
      if (editingTemplate) {
        await handleUpdateTemplate(value)
      } else {
        await handleCreateTemplate(value)
      }
    },
  })


  const handleCreateTemplate = async (value: EmailTemplateFormData) => {
    // Check if a template of this type already exists
    const existingTemplate = templates.find((t: EmailTemplate) => t.type === value.type)
    if (existingTemplate) {
      toast({
        title: "Template Already Exists",
        description: `A template for ${value.type === 'to_client' ? 'client' : 'account manager'} already exists. Please edit the existing template instead.`,
        variant: "destructive",
      })
      return
    }

    try {
      await createTemplateMutation.mutateAsync(value)
      toast({
        title: "Template Created",
        description: `Template for ${value.type === 'to_client' ? 'client' : 'account manager'} has been created`,
        variant: "success",
      })
      form.reset()
      setDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error creating template:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create template"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    form.setFieldValue('subject', template.subject)
    form.setFieldValue('body', template.body)
    form.setFieldValue('type', template.type)
    setDialogOpen(true)
  }

  const handleUpdateTemplate = async (value: EmailTemplateFormData) => {
    if (!editingTemplate) return
    
    try {
      await updateTemplateMutation.mutateAsync({
        templateId: editingTemplate.id,
        data: value,
      })
      toast({
        title: "Template Updated",
        description: `Template for ${value.type === 'to_client' ? 'client' : 'account manager'} has been updated`,
        variant: "success",
      })
      form.reset()
      setEditingTemplate(null)
      setDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error updating template:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update template"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (template: EmailTemplate) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return

    try {
      await deleteTemplateMutation.mutateAsync(templateToDelete.id)
      toast({
        title: "Template Deleted",
        description: `${templateToDelete.type === 'to_client' ? 'Client' : 'Account Manager'} email template has been deleted`,
        variant: "success",
      })
      setTemplateToDelete(null)
      setDeleteDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error deleting template:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive",
      })
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingTemplate(null)
    form.reset()
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
                const hasClientTemplate = templates.some((t: EmailTemplate) => t.type === 'to_client')
                const hasAccountManagerTemplate = templates.some((t: EmailTemplate) => t.type === 'to_account_manager')
                
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
                  form.setFieldValue('type', 'to_client')
                } else if (!hasAccountManagerTemplate) {
                  form.setFieldValue('type', 'to_account_manager')
                }
                form.setFieldValue('subject', '')
                form.setFieldValue('body', '')
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
                    const currentField = (window as WindowWithTemplateField).__currentTemplateField || 'body'
                    const fieldId = currentField === 'subject' ? 'subject' : 'body'
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
                        form.setFieldValue('subject', newValue)
                      } else {
                        form.setFieldValue('body', newValue)
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

          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
          >
            <div className="space-y-4 py-4">
              <form.Field name="type">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Type</Label>
                    <select
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value as 'to_client' | 'to_account_manager')}
                      className="w-full p-2 border rounded-md"
                      disabled={!!editingTemplate}
                    >
                      <option 
                        value="to_client" 
                        disabled={!editingTemplate && templates.some((t: EmailTemplate) => t.type === 'to_client')}
                      >
                        To Client {!editingTemplate && templates.some((t: EmailTemplate) => t.type === 'to_client') ? '(Already exists)' : ''}
                      </option>
                      <option 
                        value="to_account_manager" 
                        disabled={!editingTemplate && templates.some((t: EmailTemplate) => t.type === 'to_account_manager')}
                      >
                        To Account Manager {!editingTemplate && templates.some((t: EmailTemplate) => t.type === 'to_account_manager') ? '(Already exists)' : ''}
                      </option>
                    </select>
                    {!editingTemplate && templates.some((t: EmailTemplate) => t.type === field.state.value) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ A template of this type already exists. Please edit the existing template instead.
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
              <form.Field
                name="subject"
                validators={{
                  onChange: ({ value }) => {
                    const result = emailTemplateSchema.shape.subject.safeParse(value)
                    if (!result.success) {
                      return result.error.errors[0]?.message || 'Invalid value'
                    }
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Subject</Label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Invoice {{invoiceName}} - Payment Due"
                      className="w-full p-2 border rounded-md"
                      onFocus={() => {
                        // Store reference to subject input for variable insertion
                        ;(window as WindowWithTemplateField).__currentTemplateField = 'subject'
                      }}
                    />
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
              <form.Field
                name="body"
                validators={{
                  onChange: ({ value }) => {
                    const result = emailTemplateSchema.shape.body.safeParse(value)
                    if (!result.success) {
                      return result.error.errors[0]?.message || 'Invalid value'
                    }
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Body</Label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Dear {{clientName}},\n\nPlease find attached invoice {{invoiceName}}.\n\nAmount: {{invoiceAmount}}\nDue Date: {{dueDate}}\n\nThank you!"
                      rows={8}
                      className="w-full"
                      onFocus={() => {
                        // Store reference to body textarea for variable insertion
                        ;(window as WindowWithTemplateField).__currentTemplateField = 'body'
                      }}
                    />
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
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


