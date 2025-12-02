# Email Function Environment Variables Setup

## The Problem

The `/api/send-email` endpoint returns 500 because it needs server-side environment variables that are different from client-side `VITE_*` variables.

## Solution: Add Server-Side Environment Variables

### Step 1: Go to Pages Settings

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Pages**
2. Select your `superfriday` project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Server-Side Variables

Add these variables for **Production** environment:

**Important:** These are NOT `VITE_*` variables - they're server-side only!

```
RESEND_API_KEY=re_E9xCuGBZ_5GzZptGJeta6V97uhTfLK2A1
FROM_EMAIL=iorranpt@gmail.com
```

**Note:** 
- `RESEND_API_KEY` - Your Resend API key (same as `VITE_RESEND_API_KEY` but without `VITE_` prefix)
- `FROM_EMAIL` - Email address verified in Resend (same as `VITE_FROM_EMAIL` but without `VITE_` prefix)

### Step 3: Why Two Sets of Variables?

- **`VITE_*` variables**: Available in browser/client-side code (for build-time)
- **Server-side variables** (`RESEND_API_KEY`, `FROM_EMAIL`): Available only in Pages Functions (server-side)

The email function runs server-side, so it needs the non-VITE versions.

### Step 4: Redeploy

After adding the variables:
1. Go to **Deployments**
2. Click **Retry deployment** on latest deployment
3. Or push a small change to trigger redeploy

### Step 5: Test

After redeploy, try sending an email again. The 500 error should be resolved.

## Verification

Check the error response from `/api/send-email` - it should now show if there are any other issues, or emails should send successfully.

