'use client'

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate } from '@/hooks/use-email-templates'
import { useClients } from '@/hooks/use-clients'
import { EMAIL_TEMPLATE_VARIABLES } from '@/lib/shared/constants'
import { FileText, Plus, Edit, Trash2, Info, Copy } from 'lucide-react'
import type { EmailTemplate, WindowWithTemplateField, Client } from '@/types'
import { emailTemplateSchema, type EmailTemplateFormData } from '@/lib/shared/validations'
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

const EmailTemplateManagement = () => {
  const { data: templates = [], isLoading: loading } = useEmailTemplates()
  const { data: clients = [] } = useClients()
  const createTemplateMutation = useCreateEmailTemplate()
  const updateTemplateMutation = useUpdateEmailTemplate()
  const deleteTemplateMutation = useDeleteEmailTemplate()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null)
  const { toast } = useToast()

  const form = useForm({
    defaultValues: {
      subject: '',
      body: '',
      client_id: null as string | null,
    },
    onSubmit: async ({ value }: { value: EmailTemplateFormData }) => {
      // Convert '__accountant__' to null for the API
      const processedValue = {
        ...value,
        client_id: value.client_id === '__accountant__' ? null : value.client_id,
      }
      
      // Validate with Zod schema
      const result = emailTemplateSchema.safeParse(processedValue)
      if (!result.success) {
        toast({
          title: "Erro de Validação",
          description: result.error.errors[0]?.message || "Por favor, verifique os campos",
          variant: "destructive",
        })
        return
      }
      if (editingTemplate) {
        await handleUpdateTemplate(processedValue)
      } else {
        await handleCreateTemplate(processedValue)
      }
    },
  })


  const handleCreateTemplate = async (value: EmailTemplateFormData & { client_id: string | null }) => {
    // Check if a template for this client (or accountant) already exists
    const existingTemplate = templates.find((t: EmailTemplate) => {
      if (value.client_id === null) {
        return t.client_id === null
      }
      return t.client_id === value.client_id
    })
    if (existingTemplate) {
      if (value.client_id === null) {
        toast({
          title: "Template Já Existe",
          description: `Um template para o contador já existe. Por favor, edite o template existente.`,
          variant: "destructive",
        })
      } else {
        const clientName = clients.find((c: Client) => c.id === value.client_id)?.name || 'este cliente'
        toast({
          title: "Template Já Existe",
          description: `Um template para ${clientName} já existe. Por favor, edite o template existente.`,
          variant: "destructive",
        })
      }
      return
    }

    try {
      await createTemplateMutation.mutateAsync(value)
      const clientName = value.client_id === null 
        ? 'contador' 
        : clients.find((c: Client) => c.id === value.client_id)?.name || 'cliente'
      toast({
        title: "Template Criado",
        description: `Template para ${clientName} foi criado`,
        variant: "success",
      })
      form.reset()
      setDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error creating template:', error)
      const errorMessage = error instanceof Error ? error.message : "Falha ao criar template"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template)
    form.setFieldValue('subject', template.subject)
    form.setFieldValue('body', template.body)
    // Convert null to '__accountant__' for the select input
    form.setFieldValue('client_id', template.client_id === null ? '__accountant__' : template.client_id)
    setDialogOpen(true)
  }

  const handleUpdateTemplate = async (value: EmailTemplateFormData & { client_id: string | null }) => {
    if (!editingTemplate) return
    
    try {
      await updateTemplateMutation.mutateAsync({
        templateId: editingTemplate.id,
        data: value,
      })
      const clientName = value.client_id === null 
        ? 'contador' 
        : clients.find((c: Client) => c.id === value.client_id)?.name || 'cliente'
      toast({
        title: "Template Atualizado",
        description: `Template para ${clientName} foi atualizado`,
        variant: "success",
      })
      form.reset()
      setEditingTemplate(null)
      setDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error updating template:', error)
      const errorMessage = error instanceof Error ? error.message : "Falha ao atualizar template"
      toast({
        title: "Erro",
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
      const clientName = clients.find((c: Client) => c.id === templateToDelete.client_id)?.name || 'cliente'
      toast({
        title: "Template Deletado",
        description: `Template de email para ${clientName} foi deletado`,
        variant: "success",
      })
      setTemplateToDelete(null)
      setDeleteDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error deleting template:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao deletar template",
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
          <p className="text-center text-muted-foreground">Carregando templates...</p>
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
              Templates de Email
            </CardTitle>
            <Button 
              onClick={() => {
                form.setFieldValue('subject', '')
                form.setFieldValue('body', '')
                form.setFieldValue('client_id', null)
                setEditingTemplate(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4" role="status">
              Nenhum template ainda. Crie seu primeiro template de email.
            </p>
          ) : (
            <div className="space-y-4" role="list" aria-label="Lista de templates de email">
              {templates.map((template: EmailTemplate) => {
                const isAccountantTemplate = template.client_id === null
                const client = isAccountantTemplate ? null : clients.find((c: Client) => c.id === template.client_id)
                const clientName = isAccountantTemplate ? 'Contador (Account Manager)' : (client?.name || 'Cliente desconhecido')
                return (
                  <div
                    key={template.id}
                    className="p-3 rounded-md border bg-card"
                    role="listitem"
                    aria-label={`Template para ${clientName}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">
                          Template de Email para {clientName}
                        </p>
                        <p className="text-sm font-medium mt-2">Assunto:</p>
                        <p className="text-sm text-muted-foreground">{template.subject}</p>
                        <p className="text-sm font-medium mt-2">Prévia do Corpo:</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{template.body}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="h-8 w-8 p-0"
                          aria-label={`Editar template para ${clientName}`}
                          tabIndex={0}
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(template)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          aria-label={`Deletar template para ${clientName}`}
                          tabIndex={0}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar Template de Email' : 'Criar Template de Email'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Atualize o template de email' : 'Crie um template de email reutilizável usando as variáveis disponíveis abaixo'}
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
                      const text = String(field.value || '')
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
                  aria-label={`Inserir variável ${variable.name}: ${variable.description}`}
                  tabIndex={0}
                >
                  <code className="text-primary font-mono">{variable.example}</code>
                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
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
              <form.Field name="client_id">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Cliente / Contador *</Label>
                    <select
                      id={field.name}
                      name={field.name}
                      value={field.state.value || ''}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        const value = e.target.value
                        field.handleChange(value === '' ? null : value)
                      }}
                      className="w-full p-2 border rounded-md bg-background"
                      disabled={!!editingTemplate}
                      required
                    >
                      <option value="">Selecione um cliente ou contador</option>
                      <option value="__accountant__">Contador (Account Manager)</option>
                      {clients
                        .filter((client: Client) => {
                          // When editing, show current client. When creating, hide clients that already have templates
                          if (editingTemplate) {
                            return client.id === editingTemplate.client_id
                          }
                          return !templates.some((t: EmailTemplate) => t.client_id === client.id)
                        })
                        .map((client: Client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                    </select>
                    {!editingTemplate && field.state.value === '__accountant__' && templates.some((t: EmailTemplate) => t.client_id === null) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ Um template para o contador já existe. Por favor, edite o template existente.
                      </p>
                    )}
                    {!editingTemplate && field.state.value && field.state.value !== '__accountant__' && field.state.value !== null && templates.some((t: EmailTemplate) => t.client_id === field.state.value) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ Um template para este cliente já existe. Por favor, edite o template existente.
                      </p>
                    )}
                    {field.state.meta.errors && field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
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
                      return result.error.errors[0]?.message || 'Valor inválido'
                    }
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Assunto</Label>
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
                      return result.error.errors[0]?.message || 'Valor inválido'
                    }
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Corpo</Label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Olá {{clientName}},\n\nSegue em anexo a invoice {{invoiceName}}.\n\nValor: {{invoiceAmount}}\nPeríodo: {{monthYear}}\n\nAtenciosamente"
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
                Cancelar
              </Button>
              <Button type="submit">
                {editingTemplate ? 'Atualizar Template' : 'Criar Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá deletar permanentemente o template de email para {templateToDelete 
                ? (templateToDelete.client_id === null 
                    ? 'o contador' 
                    : clients.find((c: Client) => c.id === templateToDelete.client_id)?.name || 'este cliente')
                : 'este cliente'}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default EmailTemplateManagement
