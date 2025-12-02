# Invoice Management App

A modern invoice management application built with Next.js 15, React, and SQLite.

## Features

- 🎨 Beautiful UI built with React and Tailwind CSS
- 📤 Drag and drop file upload
- 📊 Real-time upload progress bar
- 🔔 Toast notifications for upload completion
- 💾 SQLite database for invoice management
- 📧 Email template management
- 👥 Client management

## Tech Stack

- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **SQLite (better-sqlite3)** - Database
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

The app uses SQLite for local development. The database file is stored in `data/database.db`.

To initialize or reset the database:
```bash
npm run db:init
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
# Database (optional - defaults to data/database.db)
DATABASE_PATH=./data/database.db

# Vercel Blob Storage (required)
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxx
```

To get your `BLOB_READ_WRITE_TOKEN`:
1. Go to your Vercel project dashboard
2. Navigate to Storage → Blob
3. Copy the token from the environment variables section

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
1. Set up environment variables (especially `BLOB_READ_WRITE_TOKEN`)
2. Initialize the database on first deployment (`npm run db:init`)
3. Add Vercel Blob storage to your Vercel project

## License

MIT
