"use client";

import { memo, useCallback, useMemo, useState, useEffect } from "react";
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
  const { nodes, nodeResults, updateNode, nodeStatus } = useWorkflowStore();
  const { getEdges, getNodes } = useReactFlow();
  
  const status = nodeStatus[id] || "idle";

  // Ensure data exists with defaults
  const nodeData: CropImageNodeData = {
    imageUrl: data?.imageUrl ?? null,
    xPercent: data?.xPercent ?? 0,
    yPercent: data?.yPercent ?? 0,
    widthPercent: data?.widthPercent ?? 100,
    heightPercent: data?.heightPercent ?? 100,
    label: data?.label ?? "Crop Image",
  };

  // Local state for number inputs to prevent continuous updates
  const [localX, setLocalX] = useState(nodeData.xPercent);
  const [localY, setLocalY] = useState(nodeData.yPercent);
  const [localWidth, setLocalWidth] = useState(nodeData.widthPercent);
  const [localHeight, setLocalHeight] = useState(nodeData.heightPercent);

  // Sync local state when node data changes externally
  useEffect(() => {
    setLocalX(nodeData.xPercent);
    setLocalY(nodeData.yPercent);
    setLocalWidth(nodeData.widthPercent);
    setLocalHeight(nodeData.heightPercent);
  }, [nodeData.xPercent, nodeData.yPercent, nodeData.widthPercent, nodeData.heightPercent]);

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
      const node = nodes.find(n => n.id === id);
      if (!node) return;
      updateNode(id, {
        data: {
          ...node.data,
          imageUrl: e.target.value,
        },
      });
    },
    [id, nodes, updateNode]
  );

  const updateXPercent = useCallback((value: number) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    updateNode(id, {
      data: {
        ...node.data,
        xPercent: Math.max(0, Math.min(100, value)),
      },
    });
  }, [id, nodes, updateNode]);

  const updateYPercent = useCallback((value: number) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    updateNode(id, {
      data: {
        ...node.data,
        yPercent: Math.max(0, Math.min(100, value)),
      },
    });
  }, [id, nodes, updateNode]);

  const updateWidthPercent = useCallback((value: number) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    updateNode(id, {
      data: {
        ...node.data,
        widthPercent: Math.max(0, Math.min(100, value)),
      },
    });
  }, [id, nodes, updateNode]);

  const updateHeightPercent = useCallback((value: number) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    updateNode(id, {
      data: {
        ...node.data,
        heightPercent: Math.max(0, Math.min(100, value)),
      },
    });
  }, [id, nodes, updateNode]);

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
          <Crop className="w-3 h-3" />
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

        {/* Image Input */}
        <div className="mb-3">
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Image URL</label>
          <Handle
            type="target"
            position={Position.Left}
            id="image"
            className="w-3 h-3"
            style={{ backgroundColor: "var(--text-muted)", top: "20%" }}
          />
          <input
            type="text"
            value={hasImageConnection ? aggregatedImageUrl || "" : nodeData.imageUrl || ""}
            onChange={handleImageUrlChange}
            disabled={hasImageConnection}
            placeholder="Enter image URL or connect..."
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
            style={{
              backgroundColor: hasImageConnection ? "var(--hover)" : "var(--bg)",
              color: hasImageConnection ? "var(--text-muted)" : "var(--text-primary)",
              border: "1px solid var(--border)",
              cursor: hasImageConnection ? "not-allowed" : "text",
            }}
          />
          {hasImageConnection && aggregatedImageUrl && (
            <div className="mt-1 text-xs" style={{ color: "var(--success)" }}>✓ Image connected</div>
          )}
        </div>

        {/* Crop Parameters */}
        <div className="mb-3 space-y-2">
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Crop Parameters (%)</label>
          
          {/* X Percent */}
          <div>
            <label className="block text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>X Position</label>
            <input
              type="number"
              value={localX}
              onChange={(e) => setLocalX(parseFloat(e.target.value) || 0)}
              onBlur={() => updateXPercent(localX)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateXPercent(localX);
                  e.currentTarget.blur();
                }
              }}
              min={0}
              max={100}
              step={0.1}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          {/* Y Percent */}
          <div>
            <label className="block text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Y Position</label>
            <input
              type="number"
              value={localY}
              onChange={(e) => setLocalY(parseFloat(e.target.value) || 0)}
              onBlur={() => updateYPercent(localY)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateYPercent(localY);
                  e.currentTarget.blur();
                }
              }}
              min={0}
              max={100}
              step={0.1}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          {/* Width Percent */}
          <div>
            <label className="block text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Width</label>
            <input
              type="number"
              value={localWidth}
              onChange={(e) => setLocalWidth(parseFloat(e.target.value) || 100)}
              onBlur={() => updateWidthPercent(localWidth)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateWidthPercent(localWidth);
                  e.currentTarget.blur();
                }
              }}
              min={0}
              max={100}
              step={0.1}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
          </div>

          {/* Height Percent */}
          <div>
            <label className="block text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Height</label>
            <input
              type="number"
              value={localHeight}
              onChange={(e) => setLocalHeight(parseFloat(e.target.value) || 100)}
              onBlur={() => updateHeightPercent(localHeight)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateHeightPercent(localHeight);
                  e.currentTarget.blur();
                }
              }}
              min={0}
              max={100}
              step={0.1}
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            />
          </div>
        </div>

        {/* Preview Info */}
        {aggregatedImageUrl && (
          <div
            className="mt-2 p-3 rounded-lg text-xs"
            style={{
              backgroundColor: "var(--hover)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
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
        className="w-3 h-3"
        style={{ backgroundColor: "var(--purple-glow)" }}
      />
    </div>
  );
}

export default memo(CropImageNode);
