"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Upload, Video, X } from "lucide-react";

export type UploadVideoNodeData = {
  videoUrl: string | null;
  label?: string;
  isUploading?: boolean;
  error?: string;
};

const ACCEPTED_FILE_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
const ACCEPTED_FILE_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v"];

function UploadVideoNode({ id, data, selected }: NodeProps<UploadVideoNodeData>) {
  const { updateNode, setNodeResult, nodeStatus } = useWorkflowStore();
  const { getEdges } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(data?.isUploading ?? false);
  const [error, setError] = useState<string | undefined>(data?.error);
  
  const status = nodeStatus[id] || "idle";

  // Ensure data exists with defaults
  const nodeData: UploadVideoNodeData = {
    videoUrl: data?.videoUrl ?? null,
    label: data?.label ?? "Upload Video",
    isUploading: isUploading,
    error: error,
  };

  // Check if input handle is connected using React Flow API
  const edges = getEdges();
  const hasInputConnection = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "input"
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        const errorMsg = `Invalid file type. Accepted types: ${ACCEPTED_FILE_EXTENSIONS.join(", ")}`;
        setError(errorMsg);
        updateNode(id, {
          data: {
            ...nodeData,
            error: errorMsg,
          },
        });
        return;
      }

      // Validate file size (e.g., max 500MB for videos)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        const errorMsg = "File size exceeds 500MB limit";
        setError(errorMsg);
        updateNode(id, {
          data: {
            ...nodeData,
            error: errorMsg,
          },
        });
        return;
      }

      setIsUploading(true);
      setError(undefined);

      try {
        // Create FormData
        const formData = new FormData();
        formData.append("file", file);

        // Upload to our API route
        const response = await fetch("/api/upload-video", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(errorData.error || "Upload failed");
        }

        const result = await response.json();
        const videoUrl = result.url;

        if (!videoUrl) {
          throw new Error("No URL returned from upload");
        }

        // Update node data
        updateNode(id, {
          data: {
            ...nodeData,
            videoUrl,
            isUploading: false,
            error: undefined,
          },
        });

        // Store in Zustand as node result
        setNodeResult(id, {
          output: videoUrl,
          timestamp: Date.now(),
        });

        setIsUploading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Upload failed";
        setError(errorMessage);
        setIsUploading(false);
        updateNode(id, {
          data: {
            ...nodeData,
            isUploading: false,
            error: errorMessage,
          },
        });
      } finally {
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [id, nodeData, updateNode, setNodeResult]
  );

  const handleRemoveVideo = useCallback(() => {
    updateNode(id, {
      data: {
        ...nodeData,
        videoUrl: null,
        error: undefined,
      },
    });
    setNodeResult(id, {
      output: null,
      timestamp: Date.now(),
    });
    setError(undefined);
  }, [id, nodeData, updateNode, setNodeResult]);

  const handleClick = useCallback(() => {
    if (!hasInputConnection && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [hasInputConnection, isUploading]);

  // Determine border color based on status
  const getBorderColor = () => {
    if (status === "running") return "border-yellow-500 animate-pulse";
    if (status === "success") return "border-green-500";
    if (status === "failed") return "border-red-500";
    if (selected) return "border-blue-500";
    return "border-gray-300";
  };

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-white border-2 min-w-[200px] ${getBorderColor()}`}
    >
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-gray-700">
            {nodeData.label}
          </label>
          {status === "running" && (
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          )}
          {status === "success" && (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          )}
          {status === "failed" && (
            <div className="w-2 h-2 bg-red-500 rounded-full" />
          )}
        </div>
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-3 h-3 !bg-gray-400"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(",") + "," + ACCEPTED_FILE_EXTENSIONS.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={hasInputConnection || isUploading}
        />

        {nodeData.videoUrl ? (
          <div className="relative">
            <div className="relative w-full bg-gray-100 rounded border overflow-hidden">
              <video
                src={nodeData.videoUrl}
                controls
                className="w-full max-h-48 object-contain"
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
              {!hasInputConnection && (
                <button
                  onClick={handleRemoveVideo}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  type="button"
                  aria-label="Remove video"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {error && (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={handleClick}
              disabled={hasInputConnection || isUploading}
              type="button"
              className={`w-full px-3 py-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors ${
                hasInputConnection || isUploading
                  ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                  : "bg-white border-gray-400 text-gray-700 hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
              }`}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                  <span className="text-xs">Uploading...</span>
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  <span className="text-xs">Click to upload</span>
                  <span className="text-xs text-gray-500">
                    {ACCEPTED_FILE_EXTENSIONS.join(", ")}
                  </span>
                </>
              )}
            </button>
            {error && (
              <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
}

export default memo(UploadVideoNode);
