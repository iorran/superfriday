# Guia de Migração - Novo Fluxo de Invoices

## O que foi implementado

### 1. Novo Schema do Banco de Dados
- ✅ Suporte para múltiplos arquivos por invoice (timesheet + invoice)
- ✅ Campos para email do contador por cliente
- ✅ Flag `requires_timesheet` para clientes que precisam de timesheet (INDRA)
- ✅ Novo workflow: Enviar para Cliente → Pagamento Recebido → Enviar para Contador

### 2. Sistema de Email
- ✅ Integração com SMTP Gmail via Nodemailer
- ✅ Envio automático de emails com anexos
- ✅ API routes para envio de emails
- ✅ Validação crítica: previne envio de invoices para clientes errados

### 3. Upload de Múltiplos Arquivos
- ✅ Componente FileUpload atualizado para suportar múltiplos arquivos
- ✅ Validação: INDRA requer invoice + timesheet, Cynergy Bank só invoice
- ✅ Seleção de tipo de arquivo (invoice/timesheet)

### 4. Gerenciamento de Clientes
- ✅ Campos para email do contador
- ✅ Checkbox para marcar se cliente requer timesheet
- ✅ Interface atualizada em português

## Próximos Passos Necessários

### 1. Migrar Banco de Dados Existente
```bash
# 1. Fazer backup do banco atual
cp data/database.db data/database.db.backup

# 2. Deletar banco atual
rm data/database.db*

# 3. Re-inicializar com novo schema
yarn db:init
```

### 2. Configurar Variáveis de Ambiente
Adicione ao `.env.local`:
```env
# SMTP Gmail Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app-gmail
SMTP_FROM=seu-email@gmail.com
```

**Importante**: Para Gmail, você precisa criar uma "Senha de App":
1. Vá em https://myaccount.google.com/apppasswords
2. Gere uma senha de app
3. Use essa senha no `SMTP_PASS`

### 3. Criar Clientes Iniciais
1. Vá na aba "Clients"
2. Crie INDRA:
   - Nome: INDRA
   - Email: (seu email ou email fake para teste)
   - Email do Contador: (seu email ou email do contador)
   - ✅ Marcar "Requer timesheet"
3. Crie Cynergy Bank:
   - Nome: Cynergy Bank
   - Email: (seu email ou email fake para teste)
   - Email do Contador: (seu email ou email do contador)
   - ❌ NÃO marcar "Requer timesheet"

### 4. Atualizar FileList Component
O componente FileList ainda precisa ser atualizado para:
- Trabalhar com o novo schema (id ao invés de file_key)
- Mostrar múltiplos arquivos por invoice
- Adicionar botões para enviar email para cliente e contador
- Mostrar status do workflow

### 5. Instalar Dependências
```bash
yarn install
```

## Estrutura do Novo Schema

### Tabela `invoices`
- `id` (PRIMARY KEY) - ID único do invoice
- `client_id` - Referência ao cliente
- `invoice_amount` - Valor da invoice
- `due_date` - Data de vencimento
- `month`, `year` - Mês e ano da invoice
- `sent_to_client` - Se foi enviado para o cliente
- `payment_received` - Se o pagamento foi recebido
- `sent_to_accountant` - Se foi enviado para o contador

### Tabela `invoice_files`
- `id` (PRIMARY KEY)
- `invoice_id` - Referência ao invoice
- `file_key` - Chave do arquivo no blob storage
- `file_type` - 'invoice' ou 'timesheet'
- `original_name` - Nome original do arquivo
- `file_size` - Tamanho do arquivo

### Tabela `clients`
- `accountant_email` - Email do contador
- `requires_timesheet` - Se o cliente requer timesheet

## Fluxo de Trabalho

1. **Upload**: Usuário faz upload de arquivos (invoice + timesheet se necessário)
2. **Enviar para Cliente**: Botão para enviar email com anexos para o cliente
3. **Marcar Pagamento Recebido**: Quando receber o pagamento (~30 dias)
4. **Enviar para Contador**: Botão para enviar invoice (sem timesheet) para o contador

## Validações Implementadas

- ✅ Cliente deve ser selecionado antes do upload
- ✅ INDRA requer invoice + timesheet
- ✅ Cynergy Bank requer apenas invoice
- ✅ Validação crítica no backend: previne envio para cliente errado
- ✅ Deve ter pelo menos um arquivo de invoice

## Próximas Implementações Necessárias

1. Atualizar FileList para novo schema
2. Adicionar UI para envio de emails
3. Adicionar animações e transições suaves
4. Melhorar mensagens de erro/sucesso
5. Adicionar confirmações antes de enviar emails

