# Setting Up Gmail API for Email Sending

## Option 1: Gmail API (Complex but Proper)

### Requirements:
- Google Cloud Project
- Gmail API enabled
- OAuth2 credentials
- Access token (needs refresh logic)

### Steps:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth2 credentials
5. Set up OAuth2 flow to get access token
6. Store refresh token securely
7. Implement token refresh logic

**Note:** This is complex and requires OAuth2 flow implementation.

## Option 2: EmailJS (Simpler Alternative)

EmailJS is a service that supports Gmail and is easier to set up:

1. Sign up at [EmailJS](https://www.emailjs.com/)
2. Connect your Gmail account
3. Get your service ID and template ID
4. Use EmailJS API instead

### Implementation:
```javascript
const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    service_id: 'YOUR_SERVICE_ID',
    template_id: 'YOUR_TEMPLATE_ID',
    user_id: 'YOUR_USER_ID',
    template_params: {
      to_email: to,
      subject: subject,
      message: html || body,
    }
  })
})
```

## Option 3: Keep Resend but Use Custom Domain

**Recommended:** Instead of Gmail, use Resend with your own domain:
1. Get a domain (e.g., `yourdomain.com`)
2. Verify it in Resend
3. Send from `invoices@yourdomain.com`

This is the most professional and reliable solution.

## Recommendation

For sending FROM Gmail:
- **EmailJS** is the easiest option
- **Gmail API** is more complex but gives full control
- **Custom domain with Resend** is the most professional

Which option would you like to proceed with?

