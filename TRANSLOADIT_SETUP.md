# Transloadit Setup - Quick Guide

## ✅ Step 1: Packages Installed
Already done! The following packages are installed:
- uppy
- @uppy/core
- @uppy/transloadit
- @uppy/dashboard
- @uppy/react

## 🔑 Step 2: Get Transloadit Credentials

1. Go to https://transloadit.com/
2. Sign up for a free account
3. Go to your dashboard
4. Copy your **Auth Key** (looks like: `YOUR_AUTH_KEY_HERE`)

## 📝 Step 3: Add Environment Variable

Add this to your `.env.local` file:

```
NEXT_PUBLIC_TRANSLOADIT_KEY=YOUR_AUTH_KEY_HERE
```

**Optional** - If you want to use templates for image optimization:
```
NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_IMAGE=your_template_id_here
```

## 🎯 Step 4: Test It!

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Open your workflow builder
3. Add an "Upload Image" node
4. Click to upload an image
5. Watch the console for upload progress!

## 📊 What's Already Done:

✅ Packages installed
✅ Upload hook created (`src/hooks/useTransloaditUpload.ts`)
✅ UploadImageNode updated to use Transloadit
✅ Progress tracking implemented
✅ Error handling added

## 🔄 Next Steps (Optional):

### For Video Uploads:
Update `UploadVideoNode.tsx` the same way:

1. Import the hook:
```typescript
import { useTransloaditUpload } from "@/hooks/useTransloaditUpload";
```

2. Use it in the component:
```typescript
const { upload } = useTransloaditUpload();
```

3. Replace the fetch call with:
```typescript
await upload(file, {
  templateId: process.env.NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_VIDEO,
  allowedFileTypes: ACCEPTED_VIDEO_TYPES,
  onSuccess: (url) => {
    // handle success
  },
  onError: (errorMessage) => {
    // handle error
  },
});
```

### Create Templates (Optional but Recommended):

Templates let you optimize images/videos automatically:

1. Go to Transloadit dashboard
2. Click "Templates"
3. Create a new template
4. Add steps for optimization (resize, compress, etc.)
5. Copy the template ID
6. Add to `.env.local`

## 🐛 Troubleshooting:

**Error: "Transloadit key not configured"**
- Make sure you added `NEXT_PUBLIC_TRANSLOADIT_KEY` to `.env.local`
- Restart your dev server after adding the variable

**Upload fails**
- Check your Transloadit account has credits
- Check file size (max 100MB)
- Check file type is allowed

**No URL returned**
- If using a template, make sure it's configured correctly
- Check Transloadit dashboard for assembly details

## 📖 Resources:

- Transloadit Docs: https://transloadit.com/docs/
- Uppy Docs: https://uppy.io/docs/
- Template Examples: https://transloadit.com/docs/topics/template-examples/

## ✨ You're Ready!

Just add your Transloadit key to `.env.local` and restart the server!
