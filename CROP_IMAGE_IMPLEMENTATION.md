# Crop Image Node - Implementation Summary

## Overview
The CropImageNode now performs actual image cropping using **FFmpeg via Trigger.dev** and uploads the result to **Transloadit** to get a permanent URL.

## How It Works

### 1. **User Input**
- Connect an image URL (from UploadImageNode or enter manually)
- Set crop parameters as percentages (0-100):
  - X Position (horizontal offset)
  - Y Position (vertical offset)
  - Width (crop width)
  - Height (crop height)

### 2. **Execution Flow**
When you run the workflow:

1. **Workflow Executor** (`src/lib/workflowExecutor.ts`)
   - Detects CropImage node
   - Gets image URL from connected node or node data
   - Calls `/api/trigger/crop-image` API

2. **API Route** (`src/app/api/trigger/crop-image/route.ts`)
   - Validates authentication
   - Triggers the `crop-image` Trigger.dev task
   - Waits for completion
   - Returns the cropped image URL

3. **Trigger.dev Task** (`src/trigger/cropImage.ts`)
   - Downloads the source image
   - Uses FFprobe to get original dimensions
   - Calculates pixel coordinates from percentages
   - Uses FFmpeg to crop the image: `crop=width:height:x:y`
   - Uploads cropped image to Transloadit
   - Returns the permanent URL

### 3. **Output**
- The cropped image URL is stored in the node result
- You can see it in the Workflow History panel
- You can connect it to other nodes (e.g., LLM node for image analysis)

## Files Created/Modified

### New Files:
- `src/trigger/cropImage.ts` - FFmpeg crop task
- `src/app/api/trigger/crop-image/route.ts` - API endpoint

### Modified Files:
- `src/lib/workflowExecutor.ts` - Added CropImage execution logic

## Requirements

### Environment Variables:
Already configured in your `.env.local`:
- `NEXT_PUBLIC_TRANSLOADIT_KEY` - For uploading cropped images
- `TRIGGER_API_KEY` - For running Trigger.dev tasks

### Trigger.dev Setup:
Make sure your Trigger.dev dev server is running:
```bash
npm run trigger:dev
```

## Usage Example

1. **Add nodes to canvas:**
   - Upload Image Node → Crop Image Node

2. **Configure Crop Image:**
   - Connect the image output to crop input
   - Set crop parameters (e.g., X: 10%, Y: 10%, Width: 50%, Height: 50%)

3. **Run the workflow:**
   - Click "Run Workflow" or "Run Selected"
   - Wait for execution (may take a few seconds for FFmpeg processing)
   - Check Workflow History for the cropped image URL

4. **Use the result:**
   - Connect the crop output to an LLM node for image analysis
   - Or use the URL directly from the history

## Technical Details

### FFmpeg Command:
```bash
ffmpeg -i input.jpg -vf "crop=width:height:x:y" output.jpg
```

### Transloadit Upload:
- Uses the `:original` step to store the cropped image
- Returns a permanent SSL URL

## Benefits
✅ Server-side processing (no client-side limitations)
✅ Permanent URLs via Transloadit
✅ Supports all image formats FFmpeg can handle
✅ Precise percentage-based cropping
✅ Integrated with workflow execution

## Next Steps
- Make sure Trigger.dev dev server is running
- Test with an actual image upload
- Check the Workflow History for results
