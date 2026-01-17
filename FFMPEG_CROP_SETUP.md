# FFmpeg Crop Image - Complete Setup Guide

## Overview
The CropImageNode uses FFmpeg via Trigger.dev to crop images and upload results to Transloadit.

## Prerequisites
✅ Transloadit account (already configured)
✅ Trigger.dev account
✅ FFmpeg available in Trigger.dev environment

## Step-by-Step Setup

### 1. Trigger.dev Account Setup

1. **Go to** https://trigger.dev
2. **Sign up** or log in
3. **Create a new project** (or use existing)
4. **Get your API keys:**
   - Go to your project settings
   - Copy the **API Key** and **API URL**

### 2. Update Environment Variables

Add these to your `.env.local`:

```env
# Trigger.dev (already configured)
TRIGGER_API_KEY=your_trigger_api_key_here
TRIGGER_API_URL=https://api.trigger.dev

# Transloadit (already configured)
NEXT_PUBLIC_TRANSLOADIT_KEY=a0b1bf28cefb126fc4d1431c1a10903f
TRANSLOADIT_SECRET=a530a60d540ca6c2f078bb732c32f2f597bae2ae
```

### 3. Deploy the Trigger.dev Task

The crop task is already created in `src/trigger/cropImage.ts`. To deploy it:

**Option A: Deploy to Trigger.dev Cloud (Recommended)**

```bash
# Install Trigger.dev CLI globally
npm install -g @trigger.dev/cli

# Login to Trigger.dev
npx trigger.dev login

# Deploy your tasks
npx trigger.dev deploy
```

**Option B: Run Locally for Development**

```bash
# Run the Trigger.dev dev server
npm run trigger:dev
```

This will start a local Trigger.dev server that watches for task executions.

### 4. Configure FFmpeg in Trigger.dev

Trigger.dev v3 runs tasks in isolated environments. You need to ensure FFmpeg is available:

**In your `trigger.config.ts`:**

```typescript
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "your-project-id",
  runtime: "node",
  // Add FFmpeg as a system dependency
  build: {
    extensions: [
      {
        name: "ffmpeg",
        install: "apt-get update && apt-get install -y ffmpeg",
      },
    ],
  },
});
```

### 5. Test the Setup

1. **Start your Next.js dev server:**
   ```bash
   npm run dev
   ```

2. **Start Trigger.dev dev server (in another terminal):**
   ```bash
   npm run trigger:dev
   ```

3. **Test the crop:**
   - Add an Upload Image node
   - Add a Crop Image node
   - Connect them
   - Set crop parameters
   - Run the workflow

## Files Overview

### Created Files:
- `src/trigger/cropImage.ts` - FFmpeg crop task
- `src/app/api/trigger/crop-image/route.ts` - API endpoint to trigger the task

### Modified Files:
- `src/lib/workflowExecutor.ts` - Calls the crop API during workflow execution
- `package.json` - Added trigger:dev script

## How It Works

1. **User runs workflow** with CropImage node
2. **Workflow executor** calls `/api/trigger/crop-image`
3. **API route** triggers the Trigger.dev task
4. **Trigger.dev task:**
   - Downloads the source image
   - Uses FFprobe to get dimensions
   - Uses FFmpeg to crop: `ffmpeg -i input.jpg -vf "crop=w:h:x:y" output.jpg`
   - Uploads cropped image to Transloadit
   - Returns the permanent URL
5. **Result** is stored in node output

## Troubleshooting

### Error: "trigger-dev command not found"
Run: `npm install -g @trigger.dev/cli`

### Error: "FFmpeg not found"
Make sure you've configured FFmpeg in `trigger.config.ts` (see step 4)

### Error: "Trigger.dev task not found"
Deploy your tasks: `npx trigger.dev deploy`

### Error: "Transloadit upload failed"
Check that `NEXT_PUBLIC_TRANSLOADIT_KEY` is correct in `.env.local`

## Alternative: Use Trigger.dev Cloud

If you don't want to run the dev server locally:

1. Deploy tasks to Trigger.dev cloud: `npx trigger.dev deploy`
2. Tasks will run automatically when triggered via API
3. No need to run `npm run trigger:dev`

## Next Steps

1. ✅ Set up Trigger.dev account
2. ✅ Add API keys to `.env.local`
3. ✅ Deploy or run dev server
4. ✅ Test with a workflow

Once setup is complete, the CropImage node will return actual cropped image URLs! 🎉
