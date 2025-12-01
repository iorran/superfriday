# Deployment Guide - Cloudflare Pages

## Prerequisites

1. ✅ Cloudflare account
2. ✅ D1 database created (`superfriday`)
3. ✅ R2 bucket configured (`superfriday`)
4. ✅ Code pushed to GitHub/GitLab/Bitbucket

---

## Step 1: Push Code to Git Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Create a repository on GitHub and push
git remote add origin https://github.com/yourusername/superfriday.git
git push -u origin main
```

---

## Step 2: Create D1 Database (if not done)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **D1**
3. Click **Create database**
4. Name: `superfriday`
5. Choose a region
6. Click **Create**
7. **Copy the Database ID** (you'll need it)

---

## Step 3: Run Database Migration

```bash
# Install Wrangler if not already installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Run migration
wrangler d1 execute superfriday --file=./d1-schema.sql --remote
```

---

## Step 4: Deploy to Cloudflare Pages

### Option A: Via Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Pages**
3. Click **Create a project**
4. Click **Connect to Git**
5. Select your Git provider (GitHub/GitLab/Bitbucket)
6. Authorize Cloudflare to access your repositories
7. Select the `superfriday` repository
8. Click **Begin setup**

### Build Settings:
- **Framework preset**: Vite
- **Build command**: `yarn build` (or `npm run build`)
- **Build output directory**: `dist`
- **Root directory**: `/` (leave as default)

9. Click **Save and Deploy**

---

## Step 5: Configure Environment Variables

After deployment, go to your Pages project → **Settings** → **Environment Variables**

### Add these variables:

#### For Production:
```env
VITE_R2_ACCOUNT_ID=0917b92c7c05ddd44bb6d1ebfaea0707
VITE_R2_ACCESS_KEY_ID=your-r2-access-key-id
VITE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
VITE_R2_BUCKET_NAME=superfriday
VITE_RESEND_API_KEY=re_E9xCuGBZ_5GzZptGJeta6V97uhTfLK2A1
VITE_FROM_EMAIL=invoices@yourdomain.com
```

**Note:** These are public variables (VITE_ prefix). For sensitive data, consider using Cloudflare Workers Secrets or Pages Environment Variables.

---

## Step 6: Bind D1 Database

1. Go to your Pages project → **Settings** → **Functions**
2. Scroll to **D1 Database bindings**
3. Click **Add binding**
4. **Variable name**: `DB`
5. **D1 database**: Select `superfriday`
6. Click **Save**

This makes D1 accessible in your Pages Functions via `env.DB`.

---

## Step 7: Configure Custom Domain (Optional)

1. Go to your Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `invoices.yourdomain.com`)
4. Follow DNS setup instructions
5. Cloudflare will automatically configure SSL

---

## Step 8: Verify Deployment

1. Visit your Pages URL (e.g., `https://superfriday.pages.dev`)
2. Check browser console for errors
3. Test uploading an invoice
4. Verify D1 connection (no localStorage mock warnings)

---

## Step 9: Add Initial Data to D1

After deployment, add your clients and templates:

### Via Cloudflare Dashboard:
1. Go to **Workers & Pages** → **D1** → `superfriday`
2. Click **Console** tab
3. Run these SQL commands:

```sql
-- Add your 2 clients
INSERT INTO clients (id, name, email) VALUES
  ('client-1', 'Client 1 Name', 'client1@example.com'),
  ('client-2', 'Client 2 Name', 'client2@example.com');

-- Add default email templates
INSERT INTO email_templates (id, name, subject, body, type) VALUES
  (
    'template-client',
    'Invoice to Client',
    'Invoice {{invoiceName}} - Payment Due',
    'Dear {{clientName}},\n\nPlease find attached invoice {{invoiceName}}.\n\nAmount: {{invoiceAmount}}\nDue Date: {{dueDate}}\n\nThank you!',
    'to_client'
  ),
  (
    'template-account-manager',
    'Payment Received - To Account Manager',
    'Payment Received for Invoice {{invoiceName}}',
    'Hi,\n\nPayment has been received for invoice {{invoiceName}} from {{clientName}}.\n\nAmount: {{invoiceAmount}}\n\nPlease proceed with your obligations.',
    'to_account_manager'
  );
```

---

## Step 10: Configure CORS for R2 (Important!)

Your R2 bucket needs CORS configured to allow uploads from your domain:

1. Go to **R2** → `superfriday` bucket
2. Click **Settings** tab
3. Scroll to **CORS Policy**
4. Click **Edit CORS Policy**
5. Add this configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://yourdomain.com",
      "https://superfriday.pages.dev"
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

Replace `yourdomain.com` with your actual domain.

---

## Troubleshooting

### Issue: D1 not working
- ✅ Check D1 binding is set to `DB` in Pages settings
- ✅ Verify database exists and migration ran
- ✅ Check Functions logs in Cloudflare dashboard

### Issue: R2 uploads failing
- ✅ Check CORS configuration includes your domain
- ✅ Verify R2 credentials in environment variables
- ✅ Check browser console for CORS errors

### Issue: Email not sending
- ✅ Verify Resend API key is correct
- ✅ Check `VITE_FROM_EMAIL` is a verified domain in Resend
- ✅ Check Functions logs for email errors

### Issue: Build fails
- ✅ Check build logs in Pages dashboard
- ✅ Verify all dependencies are in `package.json`
- ✅ Check for TypeScript/ESLint errors

---

## Continuous Deployment

Once connected to Git, Cloudflare Pages will:
- ✅ Automatically deploy on every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Show build logs and deployment status

---

## Production Checklist

- [ ] D1 database created and migrated
- [ ] D1 bound to Pages project as `DB`
- [ ] Environment variables configured
- [ ] R2 CORS configured for your domain
- [ ] Resend API key added
- [ ] Custom domain configured (optional)
- [ ] Initial data added to D1
- [ ] Tested invoice upload
- [ ] Tested email sending
- [ ] Tested workflow states

---

## Quick Deploy Commands

```bash
# Build locally to test
yarn build

# Preview production build
yarn preview

# Deploy via Wrangler (alternative to Git)
wrangler pages deploy dist --project-name=superfriday
```

---

## Support

If you encounter issues:
1. Check Cloudflare Pages build logs
2. Check browser console for errors
3. Check Functions logs in Cloudflare dashboard
4. Verify all environment variables are set correctly

