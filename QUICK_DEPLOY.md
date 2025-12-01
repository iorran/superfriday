# Quick Deployment Steps

## Fastest Way: Cloudflare Dashboard

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push
```

### 2. Deploy via Cloudflare Dashboard

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Pages**
2. Click **Create a project** → **Connect to Git**
3. Select your repository
4. **Build settings:**
   - Framework: Vite
   - Build command: `yarn build`
   - Output directory: `dist`
5. Click **Save and Deploy**

### 3. Configure Environment Variables

Go to your project → **Settings** → **Environment Variables** → Add:

```
VITE_R2_ACCOUNT_ID=0917b92c7c05ddd44bb6d1ebfaea0707
VITE_R2_ACCESS_KEY_ID=your-key
VITE_R2_SECRET_ACCESS_KEY=your-secret
VITE_R2_BUCKET_NAME=superfriday
VITE_RESEND_API_KEY=re_E9xCuGBZ_5GzZptGJeta6V97uhTfLK2A1
VITE_FROM_EMAIL=invoices@yourdomain.com
```

### 4. Bind D1 Database

Go to **Settings** → **Functions** → **D1 Database bindings**:
- Variable name: `DB`
- Database: `superfriday`

### 5. Run Migration

```bash
wrangler d1 execute superfriday --file=./d1-schema.sql --remote
```

### 6. Configure R2 CORS

Go to **R2** → `superfriday` → **Settings** → **CORS Policy**:
- Add your Pages domain (e.g., `https://superfriday.pages.dev`)

### 7. Done! 🎉

Your app is live at: `https://superfriday.pages.dev`

---

## Alternative: Wrangler CLI

```bash
# Build
yarn build

# Deploy
wrangler pages deploy dist --project-name=superfriday
```

---

## What Happens After Deployment?

✅ Your app is live on Cloudflare Pages
✅ `/api/d1` automatically works via Pages Functions
✅ `/api/send-email` automatically works via Pages Functions
✅ D1 database accessible via `env.DB` binding
✅ Automatic HTTPS and CDN
✅ Free SSL certificate

---

## Next Steps

1. Add custom domain (optional)
2. Add initial data to D1 (clients, templates)
3. Test all features
4. Monitor in Cloudflare dashboard

