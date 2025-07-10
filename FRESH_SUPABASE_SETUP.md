# 🚀 COMPLETE FRESH SUPABASE SETUP

## Step 1: Create New Supabase Project

1. **Go to https://supabase.com/dashboard**
2. **Click "New Project"**
3. **Choose your organization**
4. **Enter project details:**
   - Name: `fignum-app` (or whatever you prefer)
   - Database Password: Generate a strong password and **SAVE IT**
   - Region: Choose closest to you
5. **Click "Create new project"**
6. **WAIT** for the project to be created (2-3 minutes)

## Step 2: Get Your New Project Keys

1. **In your new project dashboard, go to Settings → API**
2. **Copy these values:**
   - Project URL (looks like: `https://abcdefghijk.supabase.co`)
   - anon/public key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
   - service_role key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

## Step 3: Update Your .env File

1. **Open your `.env` file** (create it if it doesn't exist)
2. **Replace with your NEW project values:**

```env
VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
```

**IMPORTANT:** Use the EXACT values from your new project!

## Step 4: Apply the Database Migration

1. **In your Supabase dashboard, go to SQL Editor**
2. **Click "New Query"**
3. **Copy the ENTIRE contents** of the migration below
4. **Paste it into the SQL Editor**
5. **Click "Run"**
6. **Wait for success messages**

## Step 5: Restart Your App

1. **Stop your dev server** (Ctrl+C)
2. **Run:** `npm run dev`
3. **Open:** http://localhost:5173

## Step 6: Test Everything

1. **Sign up with a new account** - should work perfectly
2. **Go to admin panel:** http://localhost:5173/admin.html
   - Username: `admin`
   - Password: `fignum2024!`
3. **Should see user data without errors**

---

## ✅ Success Indicators

You'll know it worked when:
- ✅ No database errors in console
- ✅ Sign up creates accounts successfully  
- ✅ Admin panel shows user data
- ✅ Database Status shows "Connected"

## 🆘 If You Need Help

1. Make sure you used the EXACT keys from your NEW project
2. Check that your new Supabase project isn't paused
3. Verify the migration ran without errors
4. Check browser console for any error messages

This fresh setup will eliminate ALL previous database conflicts!