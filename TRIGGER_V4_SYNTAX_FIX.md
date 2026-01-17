# Trigger.dev v4 Task Syntax - Fixed!

## What Was Wrong

Trigger.dev v4 changed the task syntax but still uses `/v3` import path:

### ❌ Old v3 Syntax (doesn't work in v4):
```typescript
import { task } from "@trigger.dev/sdk/v3";

export const myTask = task({
  id: "my-task",
  run: async (payload) => {  // ← Arrow function
    // ...
  },
});
```

### ✅ New v4 Syntax (correct):
```typescript
import { task } from "@trigger.dev/sdk/v3";  // Still /v3!

export const myTask = task({
  id: "my-task",
  async run(payload) {  // ← Method syntax
    // ...
  },
});
```

## What I Fixed

Updated all three task files to use v4 syntax:
- ✅ `src/trigger/cropImage.ts`
- ✅ `src/trigger/example.ts`  
- ✅ `src/trigger/llmTask.ts`

## Next Step

The trigger dev server should now detect your tasks!

**Restart it:**
1. Stop the current trigger dev server (Ctrl+C)
2. Run: `npm run trigger:dev`

You should see:
```
✓ Building local worker…
✓ Found 3 tasks:
  - crop-image
  - example-task
  - execute-llm
```

Then you can test the crop functionality! 🎉
