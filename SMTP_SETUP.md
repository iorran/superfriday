# Gmail SMTP Setup

## Overview

This app now uses SMTP directly to send emails from Gmail. We use `worker-mailer` library which works with Cloudflare Pages Functions.

## Step 1: Create Gmail App Password

**Important:** You cannot use your regular Gmail password. You need an App Password.

1. Go to your Google Account: https://myaccount.google.com/
2. Go to **Security** → **2-Step Verification** (enable it if not already enabled)
3. Scroll down to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter a name like "SuperFriday App"
6. Click **Generate**
7. Copy the 16-character password (you'll only see it once!)

## Step 2: Configure in Cloudflare Pages

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Pages**
2. Select your `superfriday` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
VITE_GMAIL_USER=yourname@gmail.com
VITE_GMAIL_APP_PASSWORD=your_16_char_app_password
VITE_FROM_EMAIL=yourname@gmail.com
```

**Important:**
- `VITE_GMAIL_USER` - Your Gmail address
- `VITE_GMAIL_APP_PASSWORD` - The 16-character app password (NOT your regular password)
- `VITE_FROM_EMAIL` - Can be same as GMAIL_USER or different if you have aliases

## Step 3: Redeploy

After adding the variables, redeploy your Pages project.

## Gmail SMTP Settings

- **Host:** smtp.gmail.com
- **Port:** 587 (STARTTLS)
- **Security:** STARTTLS
- **Authentication:** Plain (username + app password)

## Limits

- **Regular Gmail:** 500 emails/day
- **Google Workspace:** 2,000 emails/day

## Troubleshooting

### "Authentication failed"
- Make sure you're using an App Password, not your regular password
- Verify 2-Step Verification is enabled
- Check that the app password is correct (no spaces)

### "Connection timeout"
- Gmail SMTP might be blocked by Cloudflare's network
- Try port 465 with SSL instead (update code to `port: 465, secure: true`)

### "Rate limit exceeded"
- You've hit Gmail's daily sending limit
- Wait 24 hours or upgrade to Google Workspace

## Security Notes

- Never commit your app password to git
- Store it only in Cloudflare Pages environment variables
- App passwords are safer than regular passwords (can be revoked individually)

