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
  const { nodeResults, updateNode } = useWorkflowStore();
  const { getEdges, getNodes } = useReactFlow();

  // Ensure data exists with defaults
  const nodeData: ExtractFrameNodeData = {
    videoUrl: data?.videoUrl ?? null,
    timestamp: data?.timestamp ?? "0",
    label: data?.label ?? "Extract Frame",
  };

  // Check if video_url input handle is connected using React Flow API
  const edges = getEdges();
  const hasVideoUrlConnection = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "video_url"
  );

  // Aggregate video URL from connected nodes
  const aggregatedVideoUrl = useMemo(() => {
    if (!hasVideoUrlConnection) {
      return nodeData.videoUrl;
    }

    const videoEdges = edges.filter(
      (edge) => edge.target === id && edge.targetHandle === "video_url"
    );

    // Get video URL from connected nodes
    const allNodes = getNodes();
    const videoUrls = videoEdges
      .map((edge) => {
        const sourceNode = allNodes.find((n) => n.id === edge.source);

        // Check if it's an UploadVideoNode
        if (sourceNode?.type === "uploadVideo") {
          const videoData = sourceNode.data as { videoUrl?: string | null };
          return videoData?.videoUrl || null;
        }

        // Check nodeResults for output
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

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-white border-2 min-w-[250px] ${
        selected ? "border-blue-500" : "border-gray-300"
      }`}
    >
      <div className="mb-2">
        <label className="flex items-center gap-1 text-xs font-semibold text-gray-900 mb-1">
          <Film className="w-3 h-3" />
          {nodeData.label}
        </label>

        {/* Video URL Input */}
        <div className="mb-2">
          <label className="block text-xs text-gray-900 mb-1">Video URL</label>
          <Handle
            type="target"
            position={Position.Left}
            id="video_url"
            className="w-3 h-3 !bg-gray-400"
            style={{ top: "30%" }}
          />
          <input
            type="text"
            value={hasVideoUrlConnection ? aggregatedVideoUrl || "" : nodeData.videoUrl || ""}
            onChange={handleVideoUrlChange}
            disabled={hasVideoUrlConnection}
            placeholder="Enter video URL or connect..."
            className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasVideoUrlConnection
                ? "bg-gray-100 text-gray-500 cursor-not-allowed opacity-60"
                : "bg-white text-gray-900"
            }`}
          />
          {hasVideoUrlConnection && aggregatedVideoUrl && (
            <div className="mt-1 text-xs text-green-600">✓ Video connected</div>
          )}
        </div>

        {/* Timestamp Input */}
        <div className="mb-2">
          <label className="block text-xs text-gray-900 mb-1">
            Timestamp (seconds or %)
          </label>
          <input
            type="text"
            value={nodeData.timestamp}
            onChange={handleTimestampChange}
            placeholder="0 or 50%"
            className="w-full px-2 py-1.5 text-xs border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-1 text-xs text-gray-500">
            Enter a number (e.g., 10) or percentage (e.g., 50%)
          </div>
        </div>

        {/* Preview Info */}
        {aggregatedVideoUrl && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-900">
            <div>Video: Connected</div>
            <div>Timestamp: {nodeData.timestamp}</div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
}

export default memo(ExtractFrameNode);
