# Fix: Remove Custom Deploy Command

## The Problem

Your Pages project is configured with a custom deploy command: `npx wrangler deploy`

This deploys your project as a **Worker**, not **Pages**, which is why:
- ❌ You get `.workers.dev` domain instead of `.pages.dev`
- ❌ Pages Functions don't work (404 errors)
- ❌ D1 bindings don't work properly

## The Solution

### Step 1: Remove the Custom Deploy Command

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Pages**
2. Select your `superfriday` project
3. Go to **Settings** → **Builds & deployments**
4. Look for **Deploy command** or **Build command** section
5. **Remove or clear** the deploy command field
6. It should be empty (Pages will deploy automatically)
7. Click **Save**

### Step 2: Verify Build Settings

Make sure your build settings are:
- **Build command**: `yarn build` (or `npm run build`)
- **Build output directory**: `dist`
- **Root directory**: `/` (default)
- **Deploy command**: **EMPTY** (remove `npx wrangler deploy`)

### Step 3: Redeploy

After removing the deploy command:

1. Go to **Deployments**
2. Click **Retry deployment** on the latest deployment
3. Or make a small change and push to trigger automatic deployment

### Step 4: Verify It's Now Pages

After redeploy, check:
- ✅ URL should be `https://superfriday.pages.dev` (not `.workers.dev`)
- ✅ Functions should work: `/api/test`, `/api/d1`
- ✅ D1 binding should work properly

## Why This Happened

The `wrangler deploy` command is for deploying **Workers**, not **Pages**. 

- **Workers**: Use `wrangler deploy` → `.workers.dev` domain
- **Pages**: Deploy automatically from Git → `.pages.dev` domain

Pages automatically:
- Builds your project
- Deploys static files
- Discovers and deploys Functions from `functions/` directory
- Applies bindings configured in dashboard

You don't need a deploy command for Pages!

## Alternative: Use GitHub Actions Only

If you want to keep using GitHub Actions:

1. Remove the deploy command from Pages dashboard
2. Your `.github/workflows/deploy.yml` already uses `cloudflare/pages-action@v1` which is correct
3. Make sure Pages project is connected to GitHub
4. Pages will deploy automatically on push

