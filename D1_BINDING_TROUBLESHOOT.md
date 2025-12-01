# Troubleshooting D1 Binding Issue

## Why Can't You Add the D1 Binding?

### Step 1: Verify You're in Pages (Not Workers)

**Critical:** D1 bindings can ONLY be added to **Pages** projects, not Workers.

1. Go to Cloudflare Dashboard → **Workers & Pages**
2. Check where `superfriday` appears:
   - ✅ **Pages** section → Continue to Step 2
   - ❌ **Workers** section → You need to create a Pages project (see below)

### Step 2: If It's a Worker, Create a Pages Project

If `superfriday` is under Workers:

1. **Don't delete the Worker** (keep it for now)
2. **Create a new Pages project:**
   - Go to **Workers & Pages** → **Pages**
   - Click **Create a project**
   - Click **Connect to Git**
   - Select your GitHub repository (`superfriday`)
   - Click **Begin setup**
   - **Build settings:**
     - Framework preset: **Vite**
     - Build command: `yarn build`
     - Build output directory: `dist`
   - Click **Save and Deploy**

3. **Wait for first deployment to complete**

4. **Now add D1 binding:**
   - Go to your new Pages project → **Settings** → **Functions**
   - Scroll to **D1 Database bindings**
   - Click **Add binding**
   - Variable name: `DB`
   - D1 database: Select `superfriday` from dropdown
   - Click **Save**

### Step 3: Verify D1 Database Exists

If the dropdown is empty or `superfriday` doesn't appear:

1. Go to **Workers & Pages** → **D1**
2. Check if `superfriday` database exists
3. If it doesn't exist:
   - Click **Create database**
   - Name: `superfriday`
   - Choose a region
   - Click **Create**
4. Go back to Pages → Settings → Functions → Add D1 binding

### Step 4: Check Permissions

If you still can't add the binding:

1. Make sure you have **Admin** or **Editor** permissions on the account
2. Check if you're the account owner or have been granted access

### Step 5: Alternative - Use Wrangler CLI

If dashboard doesn't work, you can try via CLI:

```bash
# Install Wrangler globally
npm install -g wrangler

# Login
wrangler login

# List your D1 databases
wrangler d1 list

# Get your database ID
# Then update wrangler.toml (but this only works for Workers, not Pages)
```

**Note:** For Pages, bindings MUST be added via dashboard. Wrangler.toml doesn't work for Pages.

### Step 6: Verify Functions Are Deployed

After adding the binding:

1. Go to **Settings** → **Functions**
2. You should see:
   - Functions listed: `/api/d1`, `/api/send-email`, `/api/test`
   - D1 Database bindings: `DB` → `superfriday`

3. **Redeploy** (make a small change and push, or trigger manual deploy)

### Step 7: Test

After redeploy:

1. Try: `https://your-pages-url.pages.dev/api/test`
   - Should return: `{"success": true, "message": "Pages Functions are working!", ...}`

2. Try: `https://your-pages-url.pages.dev/api/d1` (POST request)
   - Should NOT return 404
   - If it returns 500 with "D1 database binding not found", the binding wasn't saved properly

## Common Issues

### "Add binding" button is grayed out or missing
- **Cause:** Project is a Worker, not Pages
- **Fix:** Create a Pages project

### Database doesn't appear in dropdown
- **Cause:** D1 database doesn't exist or wrong account
- **Fix:** Create the database first in D1 section

### Binding saves but still get 404
- **Cause:** Functions aren't deployed
- **Fix:** Check that `functions/` directory exists in repo root, then redeploy

### Binding saves but get "binding not found" error
- **Cause:** Binding name mismatch (should be `DB`, not `db` or `DATABASE`)
- **Fix:** Verify binding name is exactly `DB` (case-sensitive)

