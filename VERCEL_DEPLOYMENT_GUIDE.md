# Vercel Deployment Guide - Environment Variables Setup

## Issues You're Experiencing

1. ❌ **Create New File Not Working** - Database connection issue
2. ❌ **Upload Image Not Working** - Transloadit keys not configured

## Root Cause

Environment variables from your `.env.local` file are **NOT automatically deployed to Vercel**. You need to manually add them in the Vercel dashboard.

---

## 🔧 Required Environment Variables for Vercel

You need to add the following environment variables in your Vercel project settings:

### 1. **Clerk Authentication** (Required for login/auth)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cHJlY2lvdXMtZWZ0LTg3LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_8LFWADquRa7zXCnUNCqPzT8r238OFOrBCecfA0KFq0
```

### 2. **Transloadit** (Required for image/video uploads)
```
NEXT_PUBLIC_TRANSLOADIT_KEY=O01CyPwkcoZQGy2Wsy2dAhUbzCMpmURi
TRANSLOADIT_SECRET=fp3kjpu8twrmsD3N0skrpkckhQeRTvM7MJdZ0gco
```

### 3. **Database** (Required for saving workflows)
```
DATABASE_URL=postgresql://postgres.zqzlwpqjkumwsczfkfza:abhi%40workflow1@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

### 4. **Gemini API** (Required for LLM functionality)
```
GEMINI_API_KEY=AIzaSyAXAhqywUOIX9I-mzjUbQ1rFIQG2P3HRDA
```

### 5. **Trigger.dev** (Required for workflow execution)
```
TRIGGER_API_KEY=tr_dev_AI5m60LyaxD3YoUdHTHh
TRIGGER_API_URL=https://api.trigger.dev
```

---

## 📋 Step-by-Step Instructions

### Step 1: Access Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Sign in to your account
3. Select your project (workflow-builder)

### Step 2: Navigate to Environment Variables
1. Click on **Settings** tab
2. Click on **Environment Variables** in the left sidebar

### Step 3: Add Each Variable
For each environment variable listed above:

1. Click **Add New** button
2. Enter the **Key** (e.g., `NEXT_PUBLIC_TRANSLOADIT_KEY`)
3. Enter the **Value** (e.g., `O01CyPwkcoZQGy2Wsy2dAhUbzCMpmURi`)
4. Select environments:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**
5. Click **Save**

### Step 4: Redeploy
After adding all environment variables:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋮** (three dots) menu
4. Click **Redeploy**
5. Wait for deployment to complete

---

## 🔍 Verification Checklist

After redeployment, verify each feature:

### ✅ Database Connection (Create New File)
- [ ] Can create new workflows
- [ ] Workflows are saved to database
- [ ] Can see list of workflows

### ✅ Image Upload (Transloadit)
- [ ] Can click "Upload Image" node
- [ ] File picker opens
- [ ] Image uploads successfully
- [ ] Image URL appears in node

### ✅ Authentication (Clerk)
- [ ] Can sign in/sign up
- [ ] User session persists
- [ ] Protected routes work

### ✅ LLM Functionality (Gemini)
- [ ] LLM node can execute
- [ ] Receives response from Gemini
- [ ] Results display correctly

---

## 🚨 Common Issues & Solutions

### Issue 1: "Transloadit key not configured"
**Solution**: Make sure `NEXT_PUBLIC_TRANSLOADIT_KEY` is added (note the `NEXT_PUBLIC_` prefix)

### Issue 2: Database connection errors
**Solution**: 
- Verify `DATABASE_URL` is correct
- Check if Supabase allows connections from Vercel IPs
- Run `npx prisma generate` and `npx prisma db push` locally first

### Issue 3: Clerk authentication fails
**Solution**: 
- Add your Vercel domain to Clerk's allowed domains
- Go to Clerk Dashboard → Settings → Domains
- Add your Vercel URL (e.g., `your-app.vercel.app`)

### Issue 4: Changes not reflected after adding env vars
**Solution**: You MUST redeploy after adding environment variables

---

## 🔐 Security Notes

### Client-Side Variables (NEXT_PUBLIC_*)
These are **visible in the browser**:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_TRANSLOADIT_KEY`

This is **safe** because they are designed to be public.

### Server-Side Variables
These are **NOT visible in the browser**:
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `TRANSLOADIT_SECRET`
- `TRIGGER_API_KEY`

**Never** expose these in client-side code!

---

## 📝 Quick Copy-Paste Format

For easy copying, here's all variables in one block:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cHJlY2lvdXMtZWZ0LTg3LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_8LFWADquRa7zXCnUNCqPzT8r238OFOrBCecfA0KFq0

# Transloadit
NEXT_PUBLIC_TRANSLOADIT_KEY=O01CyPwkcoZQGy2Wsy2dAhUbzCMpmURi
TRANSLOADIT_SECRET=fp3kjpu8twrmsD3N0skrpkckhQeRTvM7MJdZ0gco

# Database
DATABASE_URL=postgresql://postgres.zqzlwpqjkumwsczfkfza:abhi%40workflow1@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

# Gemini API
GEMINI_API_KEY=AIzaSyAXAhqywUOIX9I-mzjUbQ1rFIQG2P3HRDA

# Trigger.dev
TRIGGER_API_KEY=tr_dev_AI5m60LyaxD3YoUdHTHh
TRIGGER_API_URL=https://api.trigger.dev
```

---

## 🎯 Priority Order

If you want to fix issues one at a time, add in this order:

1. **First**: Database + Clerk (fixes "Create New File")
   - `DATABASE_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

2. **Second**: Transloadit (fixes "Upload Image")
   - `NEXT_PUBLIC_TRANSLOADIT_KEY`
   - `TRANSLOADIT_SECRET`

3. **Third**: Gemini + Trigger (fixes LLM execution)
   - `GEMINI_API_KEY`
   - `TRIGGER_API_KEY`
   - `TRIGGER_API_URL`

---

## 📞 Need Help?

If issues persist after following this guide:

1. Check Vercel deployment logs for specific errors
2. Check browser console for client-side errors
3. Verify all environment variables are saved correctly
4. Ensure you redeployed after adding variables

---

**Last Updated**: 2026-01-18
