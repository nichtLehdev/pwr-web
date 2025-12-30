# Email Testing Guide

## Setup

1. **Add SMTP environment variables to your `.env` file:**

```env
# SMTP Configuration for Mailcow
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@your-domain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=noreply@your-domain.com
```

**Mailcow SMTP Settings:**
- **Port 587** (STARTTLS) - Use `SMTP_SECURE=false`
- **Port 465** (SSL/TLS) - Use `SMTP_SECURE=true`
- Use a Mailcow email account for authentication

## Testing Methods

### Method 1: Command Line Test (Recommended)

Run the test script to verify SMTP connection and send a test email:

```bash
pnpm test:email
```

Or with a specific test email:

```bash
TEST_EMAIL=your-email@example.com pnpm test:email
```

### Method 2: API Endpoint Test

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Check if email is configured:
   ```bash
   curl http://localhost:3000/api/test-email
   ```

3. Send a test email:
   ```bash
   curl -X POST http://localhost:3000/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@example.com"}'
   ```

### Method 3: Full Registration Flow Test

1. Make sure your dev server is running with SMTP configured
2. Go to `/register` and create a new account
3. Check your email inbox (and spam folder) for the verification email
4. Click the verification link
5. Try logging in with the verified account

## Troubleshooting

### "SMTP not configured" error
- Make sure all SMTP environment variables are set in your `.env` file
- Restart your development server after adding environment variables

### "Connection failed" error
- Verify your Mailcow SMTP host and port are correct
- Check if your Mailcow server allows SMTP connections
- Verify your email credentials are correct
- Check firewall settings if testing from a remote location

### Email not received
- Check spam/junk folder
- Verify the email address is correct
- Check Mailcow logs for delivery issues
- Make sure the SMTP user has permission to send emails

### "Email service is not configured" during registration
- This means SMTP environment variables are missing
- Add them to your `.env` file and restart the server

## Next Steps

Once email verification is working:
- Test the full registration → verification → login flow
- Verify emails are styled correctly
- Test the "resend verification email" functionality
- Check that unverified users cannot log in

