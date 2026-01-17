# Trigger.dev v3 Setup - Corrected Guide

## Important: Trigger.dev v3 Works Differently!

Trigger.dev v3 doesn't use `login` or `deploy` commands. Instead:
- Tasks run **automatically in the cloud** when triggered via API
- OR you can run them **locally** using the `dev` command

## Setup Options

### Option 1: Use Cloud (Recommended - No Setup Needed!)

Your crop task will **automatically run in Trigger.dev cloud** when you execute the workflow.

**Steps:**
1. ✅ Code is already written
2. ✅ Trigger.dev is already configured in your project
3. ✅ API key is in `.env.local`
4. **Just test it!**

**To test:**
```powershell
# Make sure dev server is running
npm run dev

# Then in your browser:
# 1. Create workflow: Upload Image → Crop Image
# 2. Upload image, set crop params
# 3. Run workflow
# 4. Check Workflow History for result
```

The task will run in Trigger.dev's cloud automatically! ✅

---

### Option 2: Run Locally (For Development/Testing)

If you want to test tasks locally before they run in the cloud:

**Terminal 1 - Next.js:**
```powershell
npm run dev
```

**Terminal 2 - Trigger.dev dev server:**
```powershell
npm run trigger:dev
```

This runs tasks on your local machine instead of the cloud.

---

## How It Works

1. **Your workflow** calls `/api/trigger/crop-image`
2. **API route** triggers the task using `tasks.triggerAndWait()`
3. **Trigger.dev** automatically:
   - Runs the task in the cloud (or locally if dev server is running)
   - Downloads image
   - Uses FFmpeg to crop
   - Uploads to Transloadit
   - Returns URL
4. **Result** appears in Workflow History

---

## Troubleshooting

### "Task not found" error
- Make sure `src/trigger/cropImage.ts` exists
- Restart your Next.js dev server: `npm run dev`

### "FFmpeg not found" error
- FFmpeg should be available in Trigger.dev's cloud environment
- If not, you may need to contact Trigger.dev support

### Check task execution
- Go to https://cloud.trigger.dev
- View your project runs and logs

---

## Ready to Test! 🚀

**No additional setup needed!** Just:
1. Make sure `npm run dev` is running
2. Create a workflow with Upload Image → Crop Image
3. Run it
4. Get your cropped image URL!

The FFmpeg crop will work automatically via Trigger.dev cloud.
