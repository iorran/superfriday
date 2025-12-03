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
