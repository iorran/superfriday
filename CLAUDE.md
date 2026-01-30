# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npm run db:init      # Initialize database (creates indexes and schema)
npm run db:migrate   # Alias for db:init
npm run db:test      # Test database connection
```

### Utilities
```bash
npm run cleanup:storage  # Remove orphaned files from Vercel Blob storage
npm run truncate:all     # Truncate all collections (dangerous!)
```

## Architecture Overview

This is a Next.js 15 invoice management application with MongoDB Atlas and Vercel Blob storage. It uses the App Router pattern (not Pages Router).

### Key Technologies
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **MongoDB** with singleton connection pattern
- **Better Auth** (v1.4.6) for authentication
- **React Query** (@tanstack/react-query) for server state
- **Vercel Blob** for file storage
- **Radix UI** + **Tailwind CSS** for UI components

### Directory Structure

```
├── app/                        # Next.js App Router
│   ├── api/                    # API routes (all backend endpoints)
│   │   ├── auth/[...all]/      # Better Auth catch-all route
│   │   ├── clients/            # Client CRUD operations
│   │   ├── invoices/           # Invoice management + PDF generation
│   │   ├── email-templates/    # Email template CRUD
│   │   ├── email-accounts/     # Email account management + OAuth
│   │   ├── email/send/         # Email sending with templates
│   │   ├── google-drive/       # Google Drive OAuth + file import
│   │   ├── upload/             # File upload handler
│   │   ├── files/[fileKey]/    # File download/delete
│   │   ├── settings/           # User settings (accountant_email, VAT)
│   │   ├── user-preferences/   # User preferences (tour state)
│   │   └── finances/           # Financial reports
│   └── */page.tsx              # Page routes (criar-invoice, settings, etc.)
├── components/                 # React components
│   ├── ui/                     # Radix UI-based primitives
│   └── [feature].tsx           # Feature-specific components
├── hooks/                      # Custom React hooks (data fetching)
├── lib/
│   ├── server/                 # Backend utilities (Node.js only)
│   │   ├── db.ts              # MongoDB connection (singleton pattern)
│   │   ├── db-operations.ts   # Database CRUD functions
│   │   ├── auth.ts            # Better Auth configuration
│   │   ├── email.ts           # Nodemailer + transporter caching
│   │   ├── storage.ts         # Vercel Blob operations
│   │   ├── encryption.ts      # AES-256-GCM for OAuth tokens
│   │   ├── google-drive.ts    # Google Drive API client
│   │   └── pdf-generator.ts   # PDFKit invoice generation
│   ├── client/                # Client-side utilities
│   │   ├── api.ts             # Fetch-based API client
│   │   └── auth.ts            # Better Auth client + useSession
│   └── shared/                # Shared between client/server
│       ├── query-keys.ts      # React Query key factory
│       ├── validations.ts     # Zod schemas
│       └── utils.ts           # Utilities
├── types/                     # TypeScript type definitions
└── scripts/                   # Utility scripts
```

## Database Layer

### Connection Pattern
- **File**: `lib/server/db.ts`
- **Pattern**: Singleton with global scope for development (prevents hot reload reconnections)
- **Environment**: `MONGODB_URI` or `DATABASE_URL`
- **Connection Pool**: max 10, min 2 connections

### Collections
- `clients` - Client information (name, email, daily rate, currency, etc.)
- `invoices` - Invoice records with workflow states
- `invoice_files` - File metadata (invoice PDFs, timesheets)
- `email_templates` - Template subjects and bodies with variable substitution
- `email_accounts` - SMTP/OAuth email account configurations
- `user_settings` - Key-value settings (accountant_email, user_vat_percentage)
- `user_preferences` - User UI preferences (tour state)
- Better Auth collections: `user`, `session`, `account`, `verification`

### Database Operations
- **File**: `lib/server/db-operations.ts`
- **Pattern**: All operations are user-scoped (filtered by `user_id`)
- **Functions**: CRUD operations for all entities with automatic user isolation
- **Encryption**: OAuth tokens and email passwords are encrypted using AES-256-GCM

### Better Auth Setup
- **File**: `lib/server/auth.ts`
- **Important**: Uses a SEPARATE MongoDB connection for auth (synchronous initialization requirement)
- **API Route**: `/app/api/auth/[...all]/route.ts` (catch-all for auth endpoints)
- **Session Helpers**: `getSession()`, `getCurrentUser()`, `requireAuth()` for server-side
- **Client Hooks**: `useSession()` from `lib/client/auth.ts`

## Data Fetching Pattern

### React Query Integration
- **Query Provider**: `components/providers/QueryProvider.tsx`
  - Stale time: 1 minute
  - Cache time: 5 minutes
  - Retry: 1 time
  - No refetch on window focus
- **Query Keys**: Centralized factory in `lib/shared/query-keys.ts`
  - Hierarchical structure: `['clients', 'list']`, `['invoices', 'detail', id]`
  - Enables targeted cache invalidation

### Custom Hooks Pattern
All data fetching hooks follow this pattern:
- `hooks/use-[feature].ts` - Query and mutation hooks
- Example: `hooks/use-clients.ts`
  - `useClients()` - Fetch all clients
  - `useClient(id)` - Fetch single client
  - `useCreateClient()` - Create mutation
  - `useUpdateClient()` - Update mutation
  - `useDeleteClient()` - Delete mutation with cache invalidation

### API Client
- **File**: `lib/client/api.ts`
- **Pattern**: Simple fetch-based client (no axios)
- **Error Handling**: Throws on non-ok responses with JSON error messages
- **Auth**: Automatic cookie-based session (managed by Better Auth)

## Authentication Flow

1. User signs up/in via Better Auth (`authClient.signIn()` or `authClient.signUp()`)
2. Session stored in HTTP-only cookies
3. Protected API routes call `requireAuth()` to verify session and get user ID
4. Client components use `useSession()` for UI state and auth checks
5. All database queries automatically filtered by `user_id`

## Invoice Workflow States

Invoices have three boolean flags that track their lifecycle:
- `sent_to_client` - Invoice emailed to client
- `payment_received` - Client paid invoice
- `sent_to_accountant` - Invoice sent to accountant

Update via: `PATCH /api/invoices/[invoiceId]/state`

## Email System

### Email Templates
- Support client-specific or accountant-wide templates
- Variable substitution: `{{clientName}}`, `{{invoiceAmount}}`, `{{month}}`, `{{year}}`, `{{monthYear}}`
- Month names rendered in Portuguese (e.g., "Janeiro" not "January")

### Email Accounts
- Support both SMTP credentials and OAuth2 (Microsoft/Outlook)
- OAuth tokens encrypted with AES-256-GCM
- Transporter caching with account-specific keys for performance
- Cache automatically cleared on account updates/deletions
- One account can be set as default for sending

### Sending Emails
- **Endpoint**: `POST /api/email/send`
- Automatically selects client-specific template if available, falls back to accountant template
- Template variables substituted before sending
- Attachments supported (invoice PDFs)
- Email history tracked in `invoice_email_history` collection

## File Storage

### Vercel Blob Integration
- **File**: `lib/server/storage.ts`
- **Operations**: `uploadFile()`, `getFile()`, `deleteFile()`
- **Token**: `BLOB_READ_WRITE_TOKEN`
- **Pattern**: File metadata stored in MongoDB, actual files in Vercel Blob
- **Cleanup**: Run `npm run cleanup:storage` to remove orphaned files

### File Types
- `invoice` - Generated or uploaded invoice PDFs
- `timesheet` - Timesheet documents (for clients that require them)

## Google Drive Integration

### OAuth Flow
1. User clicks "Connect Google Drive" → redirects to Google OAuth
2. Google redirects back with code → `/api/google-drive/auth/callback`
3. Tokens encrypted and stored in MongoDB
4. User can browse folders and import PDF files

### Security
- Read-only access (scope: `drive.readonly`)
- Tokens encrypted with `GOOGLE_OAUTH_ENCRYPTION_KEY` (AES-256-GCM)
- Automatic token refresh handled by googleapis library

## Form State Management

### Invoice Creation Form
- **Component**: `components/InvoiceCreationForm.tsx`
- **Libraries**:
  - `@tanstack/react-form` for form state
  - `@tanstack/react-store` for computed values (e.g., total calculations)
- **Validation**: Zod schema (`lib/shared/validations.ts`)
- **Pattern**: Multi-step form with embedded expense array

## Code Style Guidelines (from .cursor/rules/react.mdc)

- Use early returns for readability
- Always use Tailwind classes (never CSS or `<style>` tags)
- Use descriptive variable/function names
- Event handlers prefixed with "handle" (e.g., `handleClick`)
- Prefer `const` arrow functions over `function` declarations
- Define types explicitly where possible
- Implement accessibility features (tabindex, aria-label, keyboard handlers)

## Security Notes

### User Isolation
- **Critical**: Every database query MUST filter by `user_id`
- All API routes MUST call `requireAuth()` to get authenticated user
- Never trust client-provided user IDs

### Encryption
- OAuth tokens (Google, Microsoft) encrypted with AES-256-GCM
- Email passwords encrypted before storage
- Encryption key: `GOOGLE_OAUTH_ENCRYPTION_KEY` (32-byte base64)

### Sensitive Data
- Never commit `.env.local`
- OAuth credentials user-provided (Microsoft) - stored per email account
- SMTP passwords encrypted in database

## Environment Variables

### Required
```env
MONGODB_URI=mongodb+srv://...                    # MongoDB connection
BLOB_READ_WRITE_TOKEN=vercel_blob_...           # Vercel Blob storage
BETTER_AUTH_URL=https://yourdomain.com          # Base URL for auth
BETTER_AUTH_SECRET=your-secret-key              # Auth secret
NEXT_PUBLIC_BETTER_AUTH_URL=https://yourdomain.com  # Client-side auth URL
```

### Optional (Feature-Specific)
```env
# Google Drive Integration
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google-drive/auth/callback
GOOGLE_OAUTH_ENCRYPTION_KEY=...  # openssl rand -base64 32

# Microsoft OAuth (user-provided per account)
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/email-accounts/oauth/callback
```

## Common Patterns

### API Route Structure
```typescript
// app/api/[resource]/route.ts
export async function GET(request: NextRequest) {
  const session = await requireAuth()
  const userId = session.user.id
  // Fetch data filtered by userId
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  const userId = session.user.id
  const body = await request.json()
  // Validate, create, return
}
```

### Custom Hook Structure
```typescript
// hooks/use-[feature].ts
export function useFeatures() {
  return useQuery({
    queryKey: queryKeys.features.list(),
    queryFn: () => apiClient.get('/api/features')
  })
}

export function useCreateFeature() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => apiClient.post('/api/features', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.features.all })
    }
  })
}
```

## Multi-Currency Support

The app supports multiple currencies (EUR, GBP) configured per client. When creating invoices:
- Daily rate stored in client's currency
- Invoice amounts calculated in client's currency
- PDF generation respects currency symbol (€, £)

## Troubleshooting

### Database Connection Issues
- Run `npm run db:test` to verify connection
- Check MongoDB Atlas IP whitelist (use 0.0.0.0/0 for development)
- Verify `MONGODB_URI` includes database name

### Email Sending Issues
- Microsoft requires OAuth2 (SMTP basic auth disabled)
- Gmail requires "App Passwords" (not regular password)
- Test SMTP settings via `POST /api/settings/smtp/verify`

### File Upload Issues
- Verify `BLOB_READ_WRITE_TOKEN` is set
- Check Vercel Blob storage quota
- Files limited by Next.js config (`bodyParser.sizeLimit`)

### Better Auth Issues
- Ensure both `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` are set
- Secret must be at least 32 characters
- Auth uses separate MongoDB connection - don't close main connection

## Testing Notes

This project does not have automated tests yet. Manual testing recommended for:
- Invoice creation flow (with/without timesheets)
- Email sending (with template substitution)
- Google Drive import
- Microsoft OAuth flow
- File upload/download/deletion
- Client CRUD operations
