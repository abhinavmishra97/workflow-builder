"use client";

import { memo, useCallback, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Film } from "lucide-react";

export type ExtractFrameNodeData = {
  videoUrl: string | null;
  timestamp: string;
  label?: string;
};

function ExtractFrameNode({ id, data, selected }: NodeProps<ExtractFrameNodeData>) {
  const { nodeResults, updateNode, nodeStatus } = useWorkflowStore();
  const { getEdges, getNodes } = useReactFlow();
  
  const status = nodeStatus[id] || "idle";

  const nodeData: ExtractFrameNodeData = {
    videoUrl: data?.videoUrl ?? null,
    timestamp: data?.timestamp ?? "0",
    label: data?.label ?? "Extract Frame",
  };

  const edges = getEdges();
  const hasVideoUrlConnection = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "video_url"
  );

  const aggregatedVideoUrl = useMemo(() => {
    if (!hasVideoUrlConnection) {
      return nodeData.videoUrl;
    }

    const videoEdges = edges.filter(
      (edge) => edge.target === id && edge.targetHandle === "video_url"
    );

    const allNodes = getNodes();
    const videoUrls = videoEdges
      .map((edge) => {
        const sourceNode = allNodes.find((n) => n.id === edge.source);

        if (sourceNode?.type === "uploadVideo") {
          const videoData = sourceNode.data as { videoUrl?: string | null };
          return videoData?.videoUrl || null;
        }

        const result = nodeResults[edge.source];
        if (result && typeof result.output === "string") {
          return result.output;
        }

        return null;
      })
      .filter((url): url is string => url !== null);

    return videoUrls[0] || null;
  }, [edges, getNodes, nodeResults, id, hasVideoUrlConnection, nodeData.videoUrl]);

  const handleVideoUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNode(id, {
        data: {
          ...nodeData,
          videoUrl: e.target.value,
        },
      });
    },
    [id, nodeData, updateNode]
  );

  const handleTimestampChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      updateNode(id, {
        data: {
          ...nodeData,
          timestamp: newValue,
        },
      });
    },
    [id, nodeData, updateNode]
  );

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
      className="rounded-xl overflow-hidden min-w-[260px]"
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
        <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          <Film className="w-3 h-3" />
          {nodeData.label}
        </span>
        {status === "running" && (
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--warning)" }} />
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
        {/* Video URL Input */}
        <div className="mb-3">
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Video URL</label>
          <Handle
            type="target"
            position={Position.Left}
            id="video_url"
            className="w-3 h-3"
            style={{ backgroundColor: "var(--text-muted)", top: "30%" }}
          />
          <input
            type="text"
            value={hasVideoUrlConnection ? aggregatedVideoUrl || "" : nodeData.videoUrl || ""}
            onChange={handleVideoUrlChange}
            disabled={hasVideoUrlConnection}
            placeholder="Enter video URL or connect..."
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
            style={{
              backgroundColor: hasVideoUrlConnection ? "var(--hover)" : "var(--bg)",
              color: hasVideoUrlConnection ? "var(--text-muted)" : "var(--text-primary)",
              border: "1px solid var(--border)",
              cursor: hasVideoUrlConnection ? "not-allowed" : "text",
            }}
          />
          {hasVideoUrlConnection && aggregatedVideoUrl && (
            <div className="mt-1 text-xs" style={{ color: "var(--success)" }}>✓ Video connected</div>
          )}
        </div>

        {/* Timestamp Input */}
        <div className="mb-3">
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            Timestamp (seconds or %)
          </label>
          <input
            type="text"
            value={nodeData.timestamp}
            onChange={handleTimestampChange}
            placeholder="0 or 50%"
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
            style={{
              backgroundColor: "var(--bg)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          />
          <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Enter a number (e.g., 10) or percentage (e.g., 50%)
          </div>
        </div>

        {/* Preview Info */}
        {aggregatedVideoUrl && (
          <div
            className="mt-2 p-3 rounded-lg text-xs"
            style={{
              backgroundColor: "var(--hover)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <div>Video: Connected</div>
            <div>Timestamp: {nodeData.timestamp}</div>
          </div>
        )}

        {/* Output Handle */}
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

export default memo(ExtractFrameNode);
