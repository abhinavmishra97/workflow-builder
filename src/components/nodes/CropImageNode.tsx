"use client";

import { memo, useCallback, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Crop } from "lucide-react";

export type CropImageNodeData = {
  imageUrl: string | null;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  label?: string;
};

function CropImageNode({ id, data, selected }: NodeProps<CropImageNodeData>) {
  const { nodes, nodeResults, updateNode } = useWorkflowStore();
  const { getEdges, getNodes } = useReactFlow();

  // Ensure data exists with defaults
  const nodeData: CropImageNodeData = {
    imageUrl: data?.imageUrl ?? null,
    xPercent: data?.xPercent ?? 0,
    yPercent: data?.yPercent ?? 0,
    widthPercent: data?.widthPercent ?? 100,
    heightPercent: data?.heightPercent ?? 100,
    label: data?.label ?? "Crop Image",
  };

  // Check if image input handle is connected using React Flow API
  const edges = getEdges();
  const hasImageConnection = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "image"
  );

  // Aggregate image URL from connected nodes
  const aggregatedImageUrl = useMemo(() => {
    if (!hasImageConnection) {
      return nodeData.imageUrl;
    }

    const imageEdges = edges.filter(
      (edge) => edge.target === id && edge.targetHandle === "image"
    );

    // Get image URL from connected nodes
    const allNodes = getNodes();
    const imageUrls = imageEdges
      .map((edge) => {
        const sourceNode = allNodes.find((n) => n.id === edge.source);
        
        // Check if it's an UploadImageNode
        if (sourceNode?.type === "uploadImage") {
          const imageData = sourceNode.data as { imageUrl?: string | null };
          return imageData?.imageUrl || null;
        }
        
        // Check nodeResults for output
        const result = nodeResults[edge.source];
        if (result && typeof result.output === "string") {
          return result.output;
        }
        
        return null;
      })
      .filter((url): url is string => url !== null);

    return imageUrls[0] || null;
  }, [edges, getNodes, nodeResults, id, hasImageConnection, nodeData.imageUrl]);

  const handleImageUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNode(id, {
        data: {
          ...nodeData,
          imageUrl: e.target.value,
        },
      });
    },
    [id, nodeData, updateNode]
  );

  const handleXPercentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value) || 0;
      updateNode(id, {
        data: {
          ...nodeData,
          xPercent: Math.max(0, Math.min(100, value)),
        },
      });
    },
    [id, nodeData, updateNode]
  );

  const handleYPercentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value) || 0;
      updateNode(id, {
        data: {
          ...nodeData,
          yPercent: Math.max(0, Math.min(100, value)),
        },
      });
    },
    [id, nodeData, updateNode]
  );

  const handleWidthPercentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value) || 100;
      updateNode(id, {
        data: {
          ...nodeData,
          widthPercent: Math.max(0, Math.min(100, value)),
        },
      });
    },
    [id, nodeData, updateNode]
  );

  const handleHeightPercentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value) || 100;
      updateNode(id, {
        data: {
          ...nodeData,
          heightPercent: Math.max(0, Math.min(100, value)),
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
          <Crop className="w-3 h-3" />
          {nodeData.label}
        </label>

        {/* Image Input */}
        <div className="mb-2">
          <label className="block text-xs text-gray-900 mb-1">Image URL</label>
          <Handle
            type="target"
            position={Position.Left}
            id="image"
            className="w-3 h-3 !bg-gray-400"
            style={{ top: "20%" }}
          />
          <input
            type="text"
            value={hasImageConnection ? aggregatedImageUrl || "" : nodeData.imageUrl || ""}
            onChange={handleImageUrlChange}
            disabled={hasImageConnection}
            placeholder="Enter image URL or connect..."
            className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasImageConnection
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-white text-gray-900"
            }`}
          />
          {hasImageConnection && aggregatedImageUrl && (
            <div className="mt-1 text-xs text-green-600">✓ Image connected</div>
          )}
        </div>

        {/* Crop Parameters */}
        <div className="mb-2 space-y-2">
          <label className="block text-xs text-gray-900 mb-1">Crop Parameters (%)</label>
          
          {/* X Percent */}
          <div>
            <label className="block text-xs text-gray-900 mb-0.5">X Position</label>
            <input
              type="number"
              value={nodeData.xPercent}
              onChange={handleXPercentChange}
              min={0}
              max={100}
              step={0.1}
              className="w-full px-2 py-1 text-xs border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Y Percent */}
          <div>
            <label className="block text-xs text-gray-900 mb-0.5">Y Position</label>
            <input
              type="number"
              value={nodeData.yPercent}
              onChange={handleYPercentChange}
              min={0}
              max={100}
              step={0.1}
              className="w-full px-2 py-1 text-xs border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Width Percent */}
          <div>
            <label className="block text-xs text-gray-900 mb-0.5">Width</label>
            <input
              type="number"
              value={nodeData.widthPercent}
              onChange={handleWidthPercentChange}
              min={0}
              max={100}
              step={0.1}
              className="w-full px-2 py-1 text-xs border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Height Percent */}
          <div>
            <label className="block text-xs text-gray-900 mb-0.5">Height</label>
            <input
              type="number"
              value={nodeData.heightPercent}
              onChange={handleHeightPercentChange}
              min={0}
              max={100}
              step={0.1}
              className="w-full px-2 py-1 text-xs border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Preview Info */}
        {aggregatedImageUrl && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-900">
            <div>Crop: {nodeData.xPercent}%, {nodeData.yPercent}%</div>
            <div>Size: {nodeData.widthPercent}% × {nodeData.heightPercent}%</div>
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

export default memo(CropImageNode);
