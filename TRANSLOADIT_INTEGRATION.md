# Transloadit Integration Guide

## Overview
This guide will help you integrate Transloadit for uploading images and videos in your workflow builder.

## Step 1: Install Transloadit SDK

```bash
npm install @transloadit/uppy @uppy/core @uppy/transloadit @uppy/dashboard
```

## Step 2: Get Transloadit Credentials

1. Sign up at https://transloadit.com/
2. Get your **Auth Key** and **Auth Secret** from the dashboard
3. Create a **Template** for image/video processing (optional but recommended)

## Step 3: Add Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_TRANSLOADIT_KEY=your_auth_key_here
TRANSLOADIT_SECRET=your_auth_secret_here
NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_IMAGE=your_image_template_id
NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_VIDEO=your_video_template_id
```

## Step 4: Create Transloadit Upload Hook

Create `src/hooks/useTransloaditUpload.ts`:

```typescript
import { useState, useCallback } from 'react';
import Uppy from '@uppy/core';
import Transloadit from '@uppy/transloadit';

interface UploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  templateId?: string;
  allowedFileTypes?: string[];
}

export function useTransloaditUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (
    file: File,
    options: UploadOptions = {}
  ) => {
    const {
      onSuccess,
      onError,
      onProgress,
      templateId,
      allowedFileTypes
    } = options;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const uppy = new Uppy({
        restrictions: {
          maxFileSize: 100 * 1024 * 1024, // 100MB
          allowedFileTypes: allowedFileTypes || null,
        },
      });

      uppy.use(Transloadit, {
        params: {
          auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY! },
          template_id: templateId,
        },
        waitForEncoding: true,
        waitForMetadata: true,
      });

      uppy.on('upload-progress', (file, progress) => {
        const percentage = Math.round((progress.bytesUploaded / progress.bytesTotal) * 100);
        setProgress(percentage);
        onProgress?.(percentage);
      });

      uppy.on('complete', (result) => {
        if (result.successful && result.successful.length > 0) {
          // Get the URL from Transloadit result
          const assembly = result.transloadit?.[0];
          const uploadedFile = assembly?.results?.[':original']?.[0];
          const url = uploadedFile?.ssl_url || uploadedFile?.url;

          if (url) {
            onSuccess?.(url);
          } else {
            throw new Error('No URL returned from Transloadit');
          }
        }
        setIsUploading(false);
        uppy.close();
      });

      uppy.on('error', (error) => {
        const errorMsg = error.message || 'Upload failed';
        setError(errorMsg);
        onError?.(errorMsg);
        setIsUploading(false);
        uppy.close();
      });

      uppy.addFile({
        name: file.name,
        type: file.type,
        data: file,
      });

      await uppy.upload();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsUploading(false);
    }
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
  };
}
```

## Step 5: Update UploadImageNode.tsx

Replace the `handleFileSelect` function (lines 39-103) with:

```typescript
const { upload, isUploading: transloaditUploading, progress, error: uploadError } = useTransloaditUpload();

const handleFileSelect = useCallback(
  async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      const errorMsg = `Invalid file type. Accepted types: ${ACCEPTED_FILE_EXTENSIONS.join(", ")}`;
      setError(errorMsg);
      updateNode(id, { data: { ...nodeData, error: errorMsg } });
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      const errorMsg = "File size exceeds 10MB limit";
      setError(errorMsg);
      updateNode(id, { data: { ...nodeData, error: errorMsg } });
      return;
    }

    setIsUploading(true);
    setError(undefined);

    await upload(file, {
      templateId: process.env.NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_IMAGE,
      allowedFileTypes: ACCEPTED_FILE_TYPES,
      onSuccess: (url) => {
        updateNode(id, {
          data: { ...nodeData, imageUrl: url, isUploading: false, error: undefined },
        });
        setNodeResult(id, { output: url, timestamp: Date.now() });
        setIsUploading(false);
      },
      onError: (errorMessage) => {
        setError(errorMessage);
        setIsUploading(false);
        updateNode(id, {
          data: { ...nodeData, isUploading: false, error: errorMessage },
        });
      },
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress}%`);
      },
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  },
  [id, nodeData, updateNode, setNodeResult, upload]
);
```

## Step 6: Update UploadVideoNode.tsx

Similar changes for video uploads - use the video template ID:

```typescript
await upload(file, {
  templateId: process.env.NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_VIDEO,
  allowedFileTypes: ACCEPTED_VIDEO_TYPES,
  // ... rest of options
});
```

## Step 7: Create Transloadit Templates (Optional but Recommended)

### Image Template Example:
```json
{
  "steps": {
    "imported": {
      "robot": "/upload/handle"
    },
    "optimized": {
      "use": "imported",
      "robot": "/image/optimize",
      "progressive": true,
      "quality": 85
    },
    "resized": {
      "use": "optimized",
      "robot": "/image/resize",
      "width": 1920,
      "height": 1080,
      "resize_strategy": "fit"
    },
    "exported": {
      "use": ["resized", "optimized"],
      "robot": "/s3/store",
      "credentials": "YOUR_S3_CREDENTIALS"
    }
  }
}
```

### Video Template Example:
```json
{
  "steps": {
    "imported": {
      "robot": "/upload/handle"
    },
    "encoded": {
      "use": "imported",
      "robot": "/video/encode",
      "preset": "iphone",
      "ffmpeg_stack": "v6.0.0"
    },
    "exported": {
      "use": "encoded",
      "robot": "/s3/store",
      "credentials": "YOUR_S3_CREDENTIALS"
    }
  }
}
```

## Benefits of Using Transloadit

✅ **Automatic optimization** - Images/videos are optimized automatically
✅ **Multiple formats** - Generate multiple sizes/formats
✅ **CDN delivery** - Fast global delivery
✅ **Progress tracking** - Real-time upload progress
✅ **Error handling** - Robust error handling
✅ **Scalable** - Handles large files efficiently

## Alternative: Simple Transloadit Integration (No Templates)

If you don't want to use templates, you can upload directly:

```typescript
uppy.use(Transloadit, {
  params: {
    auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY! },
    steps: {
      import: {
        robot: '/upload/handle'
      },
      store: {
        use: 'import',
        robot: '/s3/store',
        credentials: 'YOUR_S3_CREDENTIALS'
      }
    }
  },
  waitForEncoding: true,
});
```

## Testing

1. Add a file to the Upload Image node
2. Check browser console for upload progress
3. Verify the URL is returned and displayed
4. Check Transloadit dashboard for assembly details

## Troubleshooting

- **"Auth key not found"**: Check environment variables
- **"Template not found"**: Verify template ID
- **Upload fails**: Check file size and type restrictions
- **No URL returned**: Check template configuration

## Next Steps

1. Install dependencies
2. Add environment variables
3. Create the hook
4. Update both upload nodes
5. Test with sample files
6. Configure templates for optimization (optional)
