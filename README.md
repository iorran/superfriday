# Cloudflare R2 File Upload App

A modern file upload application built with React, Vite, and Tamagui that allows you to upload files to Cloudflare R2 buckets with drag-and-drop functionality, progress tracking, and toast notifications.

## Features

- 🎨 Beautiful UI built with Tamagui
- 📤 Drag and drop file upload
- 📊 Real-time upload progress bar
- 🔔 Toast notifications for upload completion
- ☁️ Direct upload to Cloudflare R2 buckets

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Cloudflare R2

Create a `.env` file in the root directory with your Cloudflare R2 credentials:

```env
VITE_R2_ACCOUNT_ID=your-account-id-here
VITE_R2_ACCESS_KEY_ID=your-access-key-id-here
VITE_R2_SECRET_ACCESS_KEY=your-secret-access-key-here
VITE_R2_BUCKET_NAME=your-bucket-name-here
```

**How to get these values:**

1. **Account ID**: Found in the right sidebar of your Cloudflare dashboard
2. **Access Key ID & Secret Access Key**: 
   - Go to R2 in your Cloudflare dashboard
   - Navigate to "Manage R2 API Tokens"
   - Create a new API token with read and write permissions
3. **Bucket Name**: The name of your R2 bucket (create one in the R2 dashboard if you haven't)

### 3. Run the Development Server

```bash
yarn dev
```

The app will be available at `http://localhost:5173`

## Usage

1. Open the app in your browser
2. Drag and drop a file onto the upload area, or click to select a file
3. Watch the progress bar as your file uploads
4. Receive a toast notification when the upload is complete

## Build for Production

```bash
yarn build
```

## Technologies Used

- **React** - UI library
- **Vite** - Build tool and dev server
- **Tamagui** - UI component library
- **react-dropzone** - Drag and drop functionality
- **AWS SDK** - For Cloudflare R2 (S3-compatible) uploads
