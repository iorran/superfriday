# EmailJS Setup for Gmail

## Why EmailJS?

EmailJS allows you to send emails from Gmail without complex OAuth2 setup. It's the easiest way to send from Gmail.

## Setup Steps

### Step 1: Sign Up for EmailJS

1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email

### Step 2: Connect Gmail

1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Select **Gmail**
4. Follow the OAuth2 flow to connect your Gmail account
5. Note your **Service ID**

### Step 3: Create Email Template

1. Go to **Email Templates**
2. Click **Create New Template**
3. Set up your template with variables:
   - `{{from_email}}` - From email address
   - `{{to_email}}` - Recipient email
   - `{{subject}}` - Email subject
   - `{{message_html}}` - HTML message body
   - `{{message_text}}` - Plain text message body
4. Note your **Template ID**

### Step 4: Get User ID

1. Go to **Account** → **General**
2. Copy your **Public Key** (this is your User ID)

### Step 5: Configure in Cloudflare Pages

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Pages**
2. Select your `superfriday` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_USER_ID=your_user_id
VITE_FROM_EMAIL=yourname@gmail.com
```

### Step 6: Redeploy

After adding variables, redeploy your Pages project.

## EmailJS Free Tier Limits

- 200 emails/month (free tier)
- Upgrade for more if needed

## Template Example

In EmailJS template, use:
```
From: {{from_email}}
To: {{to_email}}
Subject: {{subject}}

{{message_html}}
```

## Benefits

✅ Easy setup - no OAuth2 complexity
✅ Works with Gmail
✅ Free tier available
✅ No domain verification needed
✅ Simple API

