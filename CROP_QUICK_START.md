# Quick Start: FFmpeg Crop Image

## ✅ Setup Complete!

All code is ready. Now you just need to:

### 1. Install Trigger.dev CLI (if not already installed)

```bash
npm install -g @trigger.dev/cli
```

### 2. Login to Trigger.dev

```bash
npx @trigger.dev/cli@latest login
```

This will open your browser to authenticate.

### 3. Deploy the Crop Task

```bash
npx @trigger.dev/cli@latest deploy
```

This deploys your `cropImage` task to Trigger.dev cloud.

### 4. Test It!

1. Make sure your Next.js dev server is running:
   ```bash
   npm run dev
   ```

2. In your workflow builder:
   - Add an **Upload Image** node
   - Add a **Crop Image** node
   - Connect them
   - Set crop parameters (e.g., X: 10%, Y: 10%, Width: 50%, Height: 50%)
   - Click **Run Workflow**

3. Check the **Workflow History** panel for the cropped image URL!

## How It Works

1. Upload Image node → uploads to Transloadit → returns URL
2. Crop Image node → sends URL + crop params to Trigger.dev
3. Trigger.dev task:
   - Downloads image
   - Uses FFmpeg to crop
   - Uploads to Transloadit
   - Returns new URL
4. Result appears in Workflow History

## Troubleshooting

### "Task not found"
Run: `npx @trigger.dev/cli@latest deploy`

### "FFmpeg not found" in Trigger.dev logs
FFmpeg should be available by default. If not, contact Trigger.dev support or use a custom Docker image.

### Check Trigger.dev Dashboard
- Go to https://cloud.trigger.dev
- View your project
- Check task runs and logs

## Alternative: Local Development

If you want to test locally before deploying:

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Trigger.dev dev server
npm run trigger:dev
```

The dev server will execute tasks locally instead of in the cloud.

## Files Created

- ✅ `src/trigger/cropImage.ts` - FFmpeg crop task
- ✅ `src/app/api/trigger/crop-image/route.ts` - API endpoint
- ✅ `src/lib/workflowExecutor.ts` - Updated to call crop API
- ✅ `trigger.config.ts` - Configured for FFmpeg

## Ready to Go! 🚀

Once you've deployed with `npx @trigger.dev/cli@latest deploy`, the CropImage node will work automatically!
