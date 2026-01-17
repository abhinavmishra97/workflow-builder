# Workflow History - Resizable Sidebar Feature

## Overview
Added drag-to-resize functionality to the workflow history sidebar to prevent content from being cut off and allow users to customize the sidebar width.

## Features Implemented

### 1. **Dynamic Width Control**
- Default width: **380px**
- Minimum width: **300px**
- Maximum width: **600px**
- Width is constrained to prevent sidebar from being too narrow or too wide

### 2. **Resize Handle**
- **Visual indicator**: A 1px wide handle on the left edge of the sidebar
- **Hover effect**: Highlights with accent color when hovering
- **Active state**: Shows accent color while dragging
- **Cursor feedback**: Changes to `ew-resize` cursor during drag
- **Tooltip**: "Drag to resize" on hover

### 3. **Drag-to-Resize Interaction**
1. Hover over the left edge of the sidebar
2. Click and hold the mouse button
3. Drag left to make sidebar wider
4. Drag right to make sidebar narrower
5. Release to set the new width

### 4. **State Management**
- Width is stored in Zustand store (`workflowHistoryStore`)
- Persists across component re-renders
- Can be easily extended to localStorage for persistence across sessions

### 5. **User Experience Enhancements**
- **Smooth transitions**: Width changes are smooth during resize
- **Visual feedback**: Resize handle highlights during interaction
- **Cursor changes**: Shows resize cursor during drag
- **Text selection disabled**: Prevents accidental text selection while dragging
- **Auto-cleanup**: Event listeners properly removed on unmount

## Implementation Details

### Files Modified

1. **`src/store/workflowHistoryStore.ts`**
   - Added `sidebarWidth: number` state (default: 380)
   - Added `setSidebarWidth(width: number)` action
   - Width is constrained between 300px and 600px

2. **`src/components/WorkflowHistory.tsx`**
   - Added resize state management (`isResizing`)
   - Added mouse event handlers for drag functionality
   - Added useEffect for event listener management
   - Added resize handle UI element
   - Updated container to use dynamic width

## Usage

### Resizing the Sidebar
1. Open the workflow history sidebar (if collapsed)
2. Move your mouse to the **left edge** of the sidebar
3. You'll see the cursor change to a resize cursor (↔)
4. Click and drag left/right to adjust the width
5. Release to set the new width

### Width Constraints
- **Too narrow?** The sidebar won't go below 300px to ensure content remains readable
- **Too wide?** The sidebar won't exceed 600px to preserve canvas space

## Future Enhancements

### Potential Additions
1. **LocalStorage persistence**: Save width preference across sessions
2. **Double-click to reset**: Double-click resize handle to reset to default width
3. **Preset widths**: Quick buttons for common widths (small, medium, large)
4. **Responsive breakpoints**: Auto-adjust on window resize
5. **Keyboard shortcuts**: Use keyboard to adjust width

### Example LocalStorage Implementation
```typescript
// In setSidebarWidth action
setSidebarWidth: (width) => {
  const constrainedWidth = Math.max(300, Math.min(600, width));
  localStorage.setItem('workflowHistorySidebarWidth', String(constrainedWidth));
  set({ sidebarWidth: constrainedWidth });
}

// In initial state
sidebarWidth: typeof window !== 'undefined' 
  ? parseInt(localStorage.getItem('workflowHistorySidebarWidth') || '380')
  : 380
```

## Technical Details

### Event Handling
- **MouseDown**: Initiates resize mode
- **MouseMove**: Updates width in real-time during drag
- **MouseUp**: Ends resize mode
- **Cleanup**: All event listeners properly removed to prevent memory leaks

### Performance
- Width updates are throttled by React's state batching
- No performance impact on workflow execution
- Minimal re-renders during resize

### Accessibility
- Resize handle has proper cursor feedback
- Tooltip provides clear instruction
- Visual feedback during interaction
- Keyboard users can still use sidebar normally

## Testing

To test the resize feature:
1. Run the application
2. Execute a workflow to populate history
3. Hover over the left edge of the history sidebar
4. Drag to resize and verify:
   - Width changes smoothly
   - Content adjusts properly
   - Width is constrained to 300-600px range
   - Cursor changes appropriately
   - No text selection occurs during drag
