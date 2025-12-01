# Check Deployment Status

## The 404 error on `/api/d1` means the function isn't being found

### Step 1: Verify Deployment Type

**Important:** The `.workers.dev` domain suggests this might be deployed as a **Worker**, not **Pages**.

1. Go to Cloudflare Dashboard → **Workers & Pages**
2. Check if `superfriday` appears under:
   - ✅ **Pages** (correct - functions should work)
   - ❌ **Workers** (incorrect - functions won't work)

### Step 2: If it's a Worker, Convert to Pages

If it's deployed as a Worker:

1. **Create a new Pages project:**
   - Go to **Workers & Pages** → **Pages**
   - Click **Create a project**
   - Click **Connect to Git**
   - Select your GitHub repository (`superfriday`)
   - Click **Begin setup**

2. **Configure build settings:**
   - **Framework preset**: Vite
   - **Build command**: `yarn build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (default)

3. **Add D1 Database Binding:**
   - Go to **Settings** → **Functions**
   - Scroll to **D1 Database bindings**
   - Click **Add binding**
   - **Variable name**: `DB`
   - **D1 database**: Select `superfriday`
   - Click **Save**

4. **Add Environment Variables:**
   - Go to **Settings** → **Environment Variables**
   - Add all your `VITE_*` variables

5. **Deploy:**
   - Click **Save and Deploy**
   - Wait for deployment to complete
   - Your new Pages URL will be `https://superfriday.pages.dev`

### Step 3: Verify Functions are Deployed

After deploying as Pages:

1. Go to your Pages project → **Settings** → **Functions**
2. You should see functions listed:
   - `/api/d1`
   - `/api/send-email`
   - `/api/test` (test endpoint)

3. **Test the endpoints:**
   - `https://your-pages-url.pages.dev/api/test` (should return JSON)
   - `https://your-pages-url.pages.dev/api/d1` (POST request)

### Step 4: If Functions Still Don't Appear

1. **Check build logs:**
   - Go to **Deployments** → Latest deployment
   - Look for errors about functions

2. **Verify `functions/` directory:**
   - Make sure `functions/` is in your repository root
   - Not in `dist/` directory
   - Contains `api/d1.js`, `api/send-email.js`, `_routes.json`

3. **Redeploy:**
   - Make a small change (add a comment to a function)
   - Commit and push
   - Wait for automatic redeploy

## Quick Test

Try accessing: `https://superfriday.iorranpt.workers.dev/api/test`

- **If 404**: Functions aren't deployed (likely deployed as Worker, not Pages)
- **If 200**: Functions work, but D1 binding might be missing

