# Configure R2 CORS for File Uploads

## The Problem
CORS error when uploading files because R2 bucket doesn't allow requests from your Pages domain.

## Solution: Configure CORS in R2 Bucket

### Option 1: Via Cloudflare Dashboard (Easiest)

1. Go to **Cloudflare Dashboard** → **R2**
2. Click on your `superfriday` bucket
3. Go to **Settings** tab
4. Scroll to **CORS Policy** section
5. Click **Edit CORS Policy**
6. Paste this JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://superfriday.pages.dev",
      "https://superfriday.iorranpt.workers.dev"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-request-id"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

7. Click **Save**

### Option 2: Via Wrangler CLI

If you have Wrangler installed:

```bash
# Install Wrangler if needed
npm install -g wrangler

# Login
wrangler login

# Set CORS policy
wrangler r2 bucket cors put superfriday --file r2-cors-config.json
```

### Option 3: Via Cloudflare API

You can also use the Cloudflare API to set CORS:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/r2/buckets/superfriday/cors" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @r2-cors-config.json
```

## After Configuration

1. **Wait a few seconds** for CORS to propagate
2. **Try uploading a file again** - should work now!
3. If you add a custom domain later, add it to `AllowedOrigins` array

## Verify CORS is Working

After configuring, you can test by:
1. Opening browser console
2. Trying to upload a file
3. Should no longer see CORS errors

## Troubleshooting

### Still getting CORS errors?
- Make sure the origin URL matches exactly (including `https://`)
- Check that you saved the CORS policy
- Wait a minute for changes to propagate
- Clear browser cache and try again

### Adding Custom Domain?
If you add a custom domain (e.g., `invoices.yourdomain.com`), add it to the `AllowedOrigins` array:

```json
"AllowedOrigins": [
  "https://superfriday.pages.dev",
  "https://superfriday.iorranpt.workers.dev",
  "https://invoices.yourdomain.com"
]
```

