"use client";

import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { useTransloaditUpload } from "@/hooks/useTransloaditUpload";
import { Upload, X } from "lucide-react";

export type UploadImageNodeData = {
  imageUrl: string | null;
  label?: string;
  isUploading?: boolean;
  error?: string;
};

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function UploadImageNode({ id, data, selected }: NodeProps<UploadImageNodeData>) {
  const { updateNode, setNodeResult, nodeStatus } = useWorkflowStore();
  const { getEdges } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(data?.isUploading ?? false);
  const [error, setError] = useState<string | undefined>(data?.error);
  const { upload } = useTransloaditUpload();
  
  const status = nodeStatus[id] || "idle";

  const nodeData: UploadImageNodeData = {
    imageUrl: data?.imageUrl ?? null,
    label: data?.label ?? "Upload Image",
    isUploading: isUploading,
    error: error,
  };

  const edges = getEdges();
  const hasInputConnection = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "input"
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        const errorMsg = `Invalid file type. Accepted types: ${ACCEPTED_FILE_EXTENSIONS.join(", ")}`;
        setError(errorMsg);
        updateNode(id, { 
          data: { 
            imageUrl: data?.imageUrl ?? null,
            label: data?.label ?? "Upload Image",
            isUploading: false,
            error: errorMsg 
          } 
        });
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const errorMsg = "File size exceeds 10MB limit";
        setError(errorMsg);
        updateNode(id, { 
          data: { 
            imageUrl: data?.imageUrl ?? null,
            label: data?.label ?? "Upload Image",
            isUploading: false,
            error: errorMsg 
          } 
        });
        return;
      }

      setIsUploading(true);
      setError(undefined);

      await upload(file, {
        templateId: process.env.NEXT_PUBLIC_TRANSLOADIT_TEMPLATE_IMAGE,
        allowedFileTypes: ACCEPTED_FILE_TYPES,
        onSuccess: (url) => {
          console.log("Upload successful, URL:", url);
          updateNode(id, {
            data: { 
              imageUrl: url, 
              label: data?.label ?? "Upload Image",
              isUploading: false, 
              error: undefined 
            },
          });
          setNodeResult(id, { output: url, timestamp: Date.now() });
          setIsUploading(false);
        },
        onError: (errorMessage) => {
          console.error("Upload failed:", errorMessage);
          setError(errorMessage);
          setIsUploading(false);
          updateNode(id, {
            data: { 
              imageUrl: data?.imageUrl ?? null,
              label: data?.label ?? "Upload Image",
              isUploading: false, 
              error: errorMessage 
            },
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
    [id, data, updateNode, setNodeResult, upload]
  );

  const handleRemoveImage = useCallback(() => {
    updateNode(id, { 
      data: { 
        imageUrl: null, 
        label: data?.label ?? "Upload Image",
        isUploading: false,
        error: undefined 
      } 
    });
    setNodeResult(id, { output: null, timestamp: Date.now() });
    setError(undefined);
  }, [id, data, updateNode, setNodeResult]);

  const handleClick = useCallback(() => {
    if (!hasInputConnection && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [hasInputConnection, isUploading]);

  const getStatusStyle = () => {
    if (status === "running") {
      return {
        borderColor: "var(--warning)",
        boxShadow: "0 0 0 2px var(--warning), 0 4px 12px rgba(250, 204, 21, 0.3)",
      };
    }
    if (status === "success") {
      return {
        borderColor: "var(--success)",
        boxShadow: "0 0 0 2px var(--success), 0 4px 12px rgba(34, 197, 94, 0.3)",
      };
    }
    if (status === "failed") {
      return {
        borderColor: "var(--danger)",
        boxShadow: "0 0 0 2px var(--danger), 0 4px 12px rgba(239, 68, 68, 0.3)",
      };
    }
    if (selected) {
      return {
        borderColor: "var(--purple-glow)",
        boxShadow: "0 0 0 2px var(--purple-glow)",
      };
    }
    return { borderColor: "var(--border)", boxShadow: "none" };
  };

  const statusStyle = getStatusStyle();

  return (
    <div
      className="rounded-xl overflow-hidden min-w-[220px]"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid",
        ...statusStyle,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2 border-b flex items-center justify-between"
        style={{
          backgroundColor: "var(--sidebar)",
          borderColor: "var(--border)",
        }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {nodeData.label}
        </span>
        {status === "running" && (
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--warning)" }}
          />
        )}
        {status === "success" && (
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--success)" }} />
        )}
        {status === "failed" && (
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--danger)" }} />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-3 h-3"
          style={{ backgroundColor: "var(--text-muted)" }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={hasInputConnection || isUploading}
        />

        {nodeData.imageUrl ? (
          <div className="relative">
            <div
              className="relative w-full h-32 rounded-lg border overflow-hidden"
              style={{
                backgroundColor: "var(--bg)",
                borderColor: "var(--border)",
              }}
            >
              <img
                src={nodeData.imageUrl}
                alt="Uploaded"
                className="w-full h-full object-contain"
              />
              {!hasInputConnection && (
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 p-1 rounded-full transition-colors"
                  style={{
                    backgroundColor: "var(--danger)",
                    color: "var(--text-primary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  type="button"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {error && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={handleClick}
              disabled={hasInputConnection || isUploading}
              type="button"
              className="w-full px-3 py-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor:
                  hasInputConnection || isUploading ? "var(--hover)" : "var(--bg)",
                borderColor: hasInputConnection || isUploading ? "var(--border)" : "var(--purple-glow)",
                color:
                  hasInputConnection || isUploading ? "var(--text-muted)" : "var(--text-secondary)",
                cursor: hasInputConnection || isUploading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!hasInputConnection && !isUploading) {
                  e.currentTarget.style.backgroundColor = "var(--hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!hasInputConnection && !isUploading) {
                  e.currentTarget.style.backgroundColor = "var(--bg)";
                }
              }}
            >
              {isUploading ? (
                <>
                  <div
                    className="animate-spin rounded-full h-6 w-6 border-b-2"
                    style={{ borderColor: "var(--purple-glow)" }}
                  />
                  <span className="text-xs">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">Click to upload</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {ACCEPTED_FILE_EXTENSIONS.join(", ")}
                  </span>
                </>
              )}
            </button>
            {error && (
              <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}
          </div>
        )}

        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3 h-3"
          style={{ backgroundColor: "var(--purple-glow)" }}
        />
      </div>
    </div>
  );
}

export default memo(UploadImageNode);
