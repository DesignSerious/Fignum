# Fignum Database Setup Instructions

## CRITICAL: Follow these steps EXACTLY to fix the database issues

### Step 1: Check Your Environment Variables

1. Make sure you have a `.env` file in the root directory
2. Copy the contents from `.env.example` and fill in your actual Supabase values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
```

### Step 2: Reset Your Supabase Database

1. Go to your Supabase dashboard
2. Go to Settings → Database
3. Scroll down to "Reset Database" 
4. Click "Reset Database" and confirm
5. Wait for the reset to complete

### Step 3: Apply the Migration

1. Go to SQL Editor in your Supabase dashboard
2. Copy the ENTIRE contents of `supabase/migrations/20250619231353_purple_rice.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the migration

### Step 4: Verify the Setup

1. Go to Table Editor in Supabase
2. You should see these tables:
   - `user_profiles`
   - `projects`
3. Go to Database → Functions
4. You should see functions starting with `admin_`

### Step 5: Test the Application

1. Restart your development server: `npm run dev`
2. Try to sign up with a new account
3. Check if the admin panel works at `/admin.html`

## If You Still Have Issues:

1. Check the browser console for errors
2. Check the Network tab for failed requests
3. Make sure your Supabase project is not paused
4. Verify your environment variables are correct

## Admin Panel Access:

- URL: `http://localhost:5173/admin.html`
- Username: `admin`
- Password: `fignum2024!`

## Common Issues:

1. **"relation does not exist"** - The migration wasn't applied correctly
2. **"Supabase not configured"** - Environment variables are missing or wrong
3. **"Policy already exists"** - Old migration conflicts (reset database)
4. **"Connection failed"** - Wrong URL or keys in .env file

## Need Help?

If you're still having issues, please:
1. Share your browser console errors
2. Confirm you've followed ALL steps above
3. Check that your Supabase project is active and not paused