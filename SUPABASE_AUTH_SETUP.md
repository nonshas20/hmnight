# Supabase Authentication Setup

## Quick Setup to Disable Email Confirmation

To make the authentication work without email verification, you need to configure your Supabase project:

### 1. Go to Supabase Dashboard
- Visit: https://supabase.com/dashboard
- Select your project

### 2. Disable Email Confirmation
1. Go to **Authentication** → **Providers** 
2. Click on **Email**
3. **UNCHECK** the "Confirm email" option
4. Click **Save**

### 3. Test the Authentication
1. Go to `http://localhost:3000/signup`
2. Create a new account with:
   - Name: Test User
   - Email: test@example.com  
   - Password: password123
3. Go to `http://localhost:3000/login`
4. Login with the same credentials
5. Should work immediately without email verification!

## What Changed

✅ **Now using Supabase Auth instead of localStorage**
- Persistent authentication across browser sessions
- Proper password hashing and security
- Real database storage
- Session management

✅ **No email verification required**
- Users can signup and login immediately
- No need to check email for confirmation

## Current Supabase Configuration

The app is configured to use:
- **Supabase URL**: From environment variables
- **Authentication**: Email/Password without confirmation
- **User Metadata**: Stores user's name in user_metadata

## Troubleshooting

If authentication doesn't work:
1. Check that "Confirm email" is disabled in Supabase dashboard
2. Verify your Supabase URL and keys in `.env.local`
3. Check browser console for any errors
4. Try creating a new account with a different email

## Security Note

This setup is perfect for development and internal tools. For production apps with external users, you might want to re-enable email confirmation for security.
