# Invoice Management App

A modern invoice management application built with Next.js 15, React, and MongoDB Atlas.

## Features

- 🎨 Beautiful UI built with React and Tailwind CSS
- 📤 Drag and drop file upload
- 📊 Real-time upload progress bar
- 🔔 Toast notifications for upload completion
- 💾 MongoDB Atlas database for invoice management
- 📧 Email template management
- 👥 Client management

## Tech Stack

- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **MongoDB Atlas** - NoSQL database (via Vercel)
- **Vercel Blob** - File storage

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Initialize the database:
```bash
npm run db:init
# or
yarn db:init
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database

The app uses **MongoDB Atlas** for data storage. MongoDB Atlas is a fully managed cloud database service that works seamlessly with Vercel deployments.

### Setting Up MongoDB Atlas

1. **Add MongoDB to your Vercel project:**
   - Go to your Vercel project dashboard
   - Navigate to Storage → Create Database → MongoDB
   - Follow the setup instructions
   - Vercel will automatically configure the connection string

2. **Configure environment variable:**
   - For local development, copy the connection string from your Vercel dashboard
   - Add it to your `.env.local` file:
   ```env
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
   ```
   
   **Note:** The app also supports `DATABASE_URL` for compatibility, but `MONGODB_URI` is preferred.

3. **For Vercel deployment:**
   - The `MONGODB_URI` is automatically configured when you add MongoDB to your Vercel project
   - No manual configuration needed!

To initialize the database (creates indexes):
```bash
npm run db:init
# or
yarn db:init
```

## File Storage

This app uses **Vercel Blob** for file storage. Files are stored in Vercel's global blob storage.

### Setting Up Vercel Blob

1. **Add Blob Storage to your Vercel project:**
   - Go to your Vercel project dashboard
   - Navigate to Storage → Create Database → Blob
   - Follow the setup instructions

2. **Get your Blob token:**
   - After creating the Blob store, Vercel will provide a `BLOB_READ_WRITE_TOKEN`
   - Add it to your environment variables

3. **Configure environment variable:**
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxx
   ```

   For local development, add this to `.env.local`:
   ```env
   BLOB_READ_WRITE_TOKEN=your_token_here
   ```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Atlas (required)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
# Alternative: DATABASE_URL (also supported)
# DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/dbname

# Vercel Blob Storage (required)
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxx

# Better Auth (required)
BETTER_AUTH_URL=https://yourdomain.com
BETTER_AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_BETTER_AUTH_URL=https://yourdomain.com

# Google Drive OAuth (optional - for Google Drive import)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/google-drive/auth/callback

# Encryption key for OAuth tokens (required if using Google Drive)
# Generate with: openssl rand -base64 32
GOOGLE_OAUTH_ENCRYPTION_KEY=your-32-character-base64-encryption-key

# Microsoft OAuth (required for Microsoft/Outlook email accounts)
# Each user must provide their own Client ID/Secret in email account settings
# This is only the redirect URI - users configure their own OAuth credentials
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/email-accounts/oauth/callback
```

**Getting your environment variables:**

1. **MongoDB connection string:**
   - Go to your Vercel project dashboard
   - Navigate to Storage → MongoDB
   - Copy the `MONGODB_URI` from the environment variables section
   - For local development, add it to your `.env.local` file

2. **Blob token:**
   - Go to your Vercel project dashboard
   - Navigate to Storage → Blob
   - Copy the `BLOB_READ_WRITE_TOKEN` from the environment variables section

3. **Google Drive OAuth (optional):**
   - Create a Google Cloud project at https://console.cloud.google.com
   - Enable Google Drive API
   - Create OAuth 2.0 credentials (Web application)
   - Add authorized redirect URI: `https://yourdomain.com/api/google-drive/auth/callback`
   - Copy Client ID and Client Secret to environment variables
   - Generate encryption key: `openssl rand -base64 32`
   - Add `GOOGLE_OAUTH_ENCRYPTION_KEY` to environment variables

4. **Microsoft OAuth (required for Microsoft/Outlook email accounts):**
   - Microsoft has disabled basic authentication for Outlook/Hotmail accounts
   - OAuth2 is required for Microsoft email accounts
   - **Each user must provide their own OAuth credentials:**
     - Each user registers their own app in Azure AD at https://portal.azure.com
     - Go to Azure Active Directory → App registrations → New registration
     - Set redirect URI: `https://yourdomain.com/api/email-accounts/oauth/callback`
     - Add API permission: `SMTP.Send` (requires admin consent)
     - Create a client secret
     - Users enter Application (client) ID and client secret in email account settings
     - The app will use those credentials for OAuth flow
   - **Note:** The redirect URI must match exactly what's configured in Azure AD
   - **Environment variable:** Only `MICROSOFT_REDIRECT_URI` is required (users provide their own Client ID/Secret)

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/                   # Server-side utilities
│   ├── db.ts             # Database connection
│   ├── db-client.ts      # Database operations
│   └── storage.ts        # Vercel Blob storage
├── lib/client/           # Client-side utilities
│   ├── db-client.ts     # Database API client
│   └── storage-client.ts # Storage API client
└── scripts/              # Utility scripts
    └── init-db.js        # Database initialization
```

## Build for Production

```bash
npm run build
npm start
```

## Deployment

This app can be deployed to:
- **Vercel** (recommended for Next.js)
- **Railway**
- **Render**
- Any Node.js hosting platform

Make sure to:
1. Add MongoDB Atlas to your Vercel project (environment variables are automatically configured)
2. Add Vercel Blob storage to your Vercel project
3. Initialize the database indexes on first deployment (`npm run db:init` or `yarn db:init`)
4. Set up environment variables for local development (see Environment Variables section above)

## License

MIT
