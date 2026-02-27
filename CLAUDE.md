# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
npm run dev              # Start development server (localhost:3000)
npm run build            # Build for production
npm run lint             # Run ESLint
npm run db:init          # Initialize database (creates indexes and schema)
npm run db:test          # Test database connection
npm run cleanup:storage  # Remove orphaned files from Vercel Blob storage
```

## Architecture Overview

Next.js 15 invoice management app for freelancers, using App Router (not Pages Router). UI text is primarily in Portuguese. Deployed on Vercel with MongoDB Atlas and Vercel Blob storage.

**Key stack**: Next.js 15, React 19, TypeScript, MongoDB (raw driver — no Mongoose/Prisma), Better Auth, React Query, Vercel Blob, Radix UI + Tailwind CSS, PDFKit.

### Directory Structure

```
app/                    # Next.js App Router pages + API routes
components/
├── ui/                 # Radix UI primitives (shadcn/ui-style with class-variance-authority)
├── features/           # Feature-specific composites (file-upload/, invoices/)
└── *.tsx               # Page-level components (DashboardLayout, InvoiceCreationForm, etc.)
hooks/                  # React Query hooks (use-[feature].ts pattern)
lib/
├── server/             # Backend-only: db, auth, email, encryption, pdf, storage
├── client/             # Client-only: API client (api.ts), auth client (auth.ts)
└── shared/             # Shared: query-keys, validations (Zod), utils, constants
types/                  # TypeScript type definitions
scripts/                # DB init, cleanup utilities
```

## Critical Architectural Details

### Custom ID Scheme (Not ObjectIds)
All application records use custom string IDs, not MongoDB `_id`. Format: `"client-{timestamp}"`, `"invoice-{timestamp}"`, `"template-{timestamp}"`, etc. All queries use `{ id: ..., user_id: ... }`. The `scripts/init-db.cjs` creates unique indexes on these `id` fields.

### Two MongoDB Connections
The app maintains **two separate MongoDB connections**:
1. `lib/server/db.ts` — Singleton for all app data (clients, invoices, etc.)
2. `lib/server/auth.ts` — Dedicated connection for Better Auth (synchronous initialization requirement)

The main connection uses a global scope singleton to survive Next.js hot reloads in development.

### No Auth Middleware
There is **no `middleware.ts`** file. Authentication is enforced differently on each layer:
- **API routes**: Server-side via `requireAuth()` (mandatory for all protected endpoints)
- **Pages**: Client-side redirect in `DashboardLayout.tsx` using `useEffect` + `useSession()`
- Login/signup pages bypass `DashboardLayout` by checking `pathname`

### PDFKit Server External Package
`next.config.js` declares `serverExternalPackages: ['pdfkit']`. This is **critical** — without it, Next.js tries to bundle PDFKit and fails. Do not remove this config.

### Encryption Key Naming Quirk
`GOOGLE_OAUTH_ENCRYPTION_KEY` is used for **all** encryption (Google OAuth tokens, Microsoft OAuth tokens, SMTP passwords), not just Google. It must be a base64-encoded 32-byte value. Format stored: `IV (16 bytes) + AuthTag (16 bytes) + ciphertext` as a single base64 string.

### `__new__` Client Convention
In invoice creation, if `clientId` starts with `"__new__"`, the text after the prefix becomes the new client's name (e.g., `"__new__Acme Corp"` auto-creates client "Acme Corp").

### Invoice Queries Use Aggregation
Invoice list queries use MongoDB `$lookup` aggregation pipelines to join client data and invoice files in a single round-trip. This is an intentional performance optimization in `db-operations.ts`.

### Cache Invalidation Cross-Dependencies
When a client is updated or deleted, both the `clients` and `invoices` query caches are invalidated (because invoice list data embeds client name/email via aggregation).

### init-db.cjs is CommonJS
The database init script (`scripts/init-db.cjs`) is intentionally CommonJS (`.cjs`) while the rest of the project is ESM (`"type": "module"`). This is because it needs synchronous `require('dotenv')` to load `.env.local` before anything runs.

## Database Layer

### Collections
- `clients` — Client info (name, email, daily rate, currency)
- `invoices` — Invoice records with workflow states
- `invoice_files` — File metadata (invoice PDFs, timesheets)
- `email_templates` — Template subjects/bodies with variable substitution
- `email_accounts` — SMTP/OAuth email configurations
- `settings` — Key-value store per user (keys: `accountant_email`, `user_company_name`, `user_address`, `user_vat`, `user_bank_account`, `user_iban`, `user_bank_account_name`, `user_vat_percentage`)
- `user_preferences` — UI preferences (tour completion state)
- `email_history` — Email sending history per invoice
- `google_oauth_tokens` — Encrypted Google Drive tokens
- Better Auth collections: `user`, `session`, `account`, `verification`

### Database Operations
- **File**: `lib/server/db-operations.ts` (~1200+ lines)
- All operations are user-scoped (filtered by `user_id`)
- CRUD operations for all entities with automatic user isolation
- OAuth tokens and email passwords are encrypted before storage using AES-256-GCM

## Security: User Isolation
- **Critical**: Every database query MUST filter by `user_id`
- All API routes MUST call `requireAuth()` to get the authenticated user
- Never trust client-provided user IDs

## Data Fetching Pattern

- **Query Provider** (`components/providers/QueryProvider.tsx`): staleTime 1min, gcTime 5min, retry 1, no refetchOnWindowFocus
- **Query Keys**: Centralized factory in `lib/shared/query-keys.ts` with hierarchical arrays
- **Hooks**: `hooks/use-[feature].ts` — each exports `useFeatures()`, `useFeature(id)`, `useCreateFeature()`, `useUpdateFeature()`, `useDeleteFeature()`
- **API Client** (`lib/client/api.ts`): Fetch-based, throws on non-ok responses, auth via cookies

## Invoice Workflow States

Three boolean flags track lifecycle: `sent_to_client`, `payment_received`, `sent_to_accountant`.
Update via: `PATCH /api/invoices/[invoiceId]/state`

## Email System

- **Templates**: Support client-specific or accountant-wide. Variables: `{{clientName}}`, `{{invoiceName}}`, `{{invoiceAmount}}`, `{{month}}`, `{{year}}`, `{{monthYear}}`, `{{downloadLink}}`, `{{currentDate}}`, `{{clientVat}}`, `{{clientAddress}}`
- **Accounts**: SMTP credentials or OAuth2 (Microsoft/Outlook). One account can be set as default.
- **Transporter caching**: Module-level `Map` in `lib/server/email.ts` keyed by `account-{id}`. Cache cleared on account update/delete.
- **Fallback priority**: Specific account → default account for user → environment SMTP variables
- **Sending** (`POST /api/email/send`): Auto-selects client template if available, falls back to accountant template. Email history tracked in `email_history` collection.

## PDF Generation

- `lib/server/pdf-generator.ts` uses PDFKit to generate A4 invoices
- User info for PDFs is pulled from the `settings` collection (company name, address, VAT, bank details)
- If required settings are missing, the API returns an error asking the user to fill in company info first
- Supports multi-currency (EUR €, GBP £) per client

## Localization

- UI labels are primarily in Portuguese
- Currency formatting uses `Intl.NumberFormat('pt-PT', ...)` (e.g., `12.696,00`)
- Month names exist in three forms in `lib/shared/constants.ts`: `MONTH_NAMES_EN`, `MONTH_NAMES_SHORT`, `MONTH_NAMES_PT`
- `{{monthYear}}` template variable renders in English (e.g., "January 2024")

## UI Design System

- Tailwind CSS with **CSS variable-based semantic color tokens** (`bg-primary`, `text-muted-foreground`, etc.)
- Colors defined as HSL CSS variables in `globals.css` with light/dark mode variants
- Dark mode is class-based (`darkMode: ["class"]`)
- Follows shadcn/ui conventions: Radix UI primitives + `class-variance-authority` for variants
- Border-radius uses `--radius` CSS variable

## Code Style

- Use early returns for readability
- Always use Tailwind classes (never CSS or `<style>` tags)
- Event handlers prefixed with "handle" (e.g., `handleClick`)
- Prefer `const` arrow functions over `function` declarations
- Define types explicitly where possible

## Settings Page Sub-Routes

The `/settings/` area has its own sub-routing:
- `/settings/clients` — Client CRUD
- `/settings/email-accounts` — Email account management + OAuth flows
- `/settings/general` — Accountant email setting
- `/settings/templates` — Email template CRUD
- `/settings/user-info` — Company/user info for PDF generation

## Notable API Routes (Beyond CRUD)

- `POST /api/invoices/generate-pdf` — Generates PDF in-memory, returns as download
- `POST /api/pdf/extract` — Extracts invoice data from uploaded PDFs
- `POST /api/invoices/import-old` — Batch import of old invoices (marks as already sent)
- `POST /api/invoices/[invoiceId]/add-signature` — Adds signature to existing invoice PDF
- `POST /api/invoices/[invoiceId]/upload-signed` — Uploads signed version of PDF
- `DELETE /api/user/delete-all-data` — Deletes all data for current user

## Tour System

`components/Tour.tsx` implements a guided tour targeting DOM elements via `data-tour="..."` attributes. Completion state persisted to `user_preferences` collection. `TOUR_VERSION` constant in `hooks/use-tour.ts` controls whether the tour replays after updates.

## Environment Variables

### Required
```env
MONGODB_URI=mongodb+srv://...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
BETTER_AUTH_URL=https://yourdomain.com
BETTER_AUTH_SECRET=your-secret-key              # At least 32 characters
NEXT_PUBLIC_BETTER_AUTH_URL=https://yourdomain.com
```

### Optional
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google-drive/auth/callback
GOOGLE_OAUTH_ENCRYPTION_KEY=...                 # openssl rand -base64 32 (used for ALL encryption)
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/email-accounts/oauth/callback
```

## Testing

No automated tests exist. No test runner is configured.
