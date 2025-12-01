# Troubleshooting Cloudflare Pages Deployment

## Issue: 404 on `/api/d1` endpoint

### Step 1: Verify Functions are Deployed

1. Go to Cloudflare Dashboard → **Workers & Pages** → **Pages**
2. Select your `superfriday` project
3. Go to **Settings** → **Functions**
4. Check if functions are listed under "Functions"
5. You should see:
   - `/api/d1` (from `functions/api/d1.js`)
   - `/api/send-email` (from `functions/api/send-email.js`)

### Step 2: Verify D1 Database Binding

1. In your Pages project → **Settings** → **Functions**
2. Scroll to **D1 Database bindings**
3. Verify there's a binding with:
   - **Variable name**: `DB`
   - **D1 database**: `superfriday`
4. If missing, click **Add binding** and configure:
   - Variable name: `DB`
   - D1 database: Select `superfriday` from the dropdown

### Step 3: Check Build Logs

1. Go to your Pages project → **Deployments**
2. Click on the latest deployment
3. Check the build logs for any errors
4. Look for messages about functions being discovered

### Step 4: Verify Function Structure

Your functions should be in:
```
functions/
  _routes.json
  api/
    d1.js
    send-email.js
```

### Step 5: Redeploy

If functions aren't showing up:
1. Make a small change (add a comment to a function file)
2. Commit and push
3. Wait for automatic redeploy
4. Check Functions tab again

## Common Issues

### Functions not appearing
- **Cause**: Functions directory not included in deployment
- **Fix**: Ensure `functions/` directory is in your repository root

### D1 binding not found
- **Cause**: D1 database not bound in Pages settings
- **Fix**: Add D1 binding in Pages → Settings → Functions → D1 Database bindings

### 404 on API endpoints
- **Cause**: Functions not deployed or routing misconfigured
- **Fix**: Verify `_routes.json` includes `/api/*` and functions are deployed

