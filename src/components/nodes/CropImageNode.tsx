"use client";

import { memo, useCallback, useMemo, useState, useEffect } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Crop, ChevronDown, ChevronUp, Loader2, Play } from "lucide-react";

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
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);
  
  const status = nodeStatus[id] || "idle";
  const result = nodeResults[id];
  const outputUrl = typeof result?.output === "string" ? result.output : "";

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

  const handleRun = useCallback(async () => {
    const imageUrl = aggregatedImageUrl || nodeData.imageUrl;
    
    if (!imageUrl) {
      console.error("No image URL provided");
      return;
    }

    // Set loading state
    useWorkflowStore.getState().setNodeStatus(id, "running");

    try {
      const response = await fetch("/api/trigger/crop-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          xPercent: nodeData.xPercent,
          yPercent: nodeData.yPercent,
          widthPercent: nodeData.widthPercent,
          heightPercent: nodeData.heightPercent,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Crop failed");
      }

      // Update node result
      useWorkflowStore.getState().setNodeResult(id, {
        output: result.croppedImageUrl,
        timestamp: Date.now(),
      });

      useWorkflowStore.getState().setNodeStatus(id, "success");
      setIsOutputExpanded(true);
    } catch (error) {
      console.error("[Crop Node] Execution error:", error);
      useWorkflowStore.getState().setNodeStatus(id, "failed");
      
      useWorkflowStore.getState().setNodeResult(id, {
        output: error instanceof Error ? error.message : "Execution failed",
        timestamp: Date.now(),
      });
    }
  }, [id, aggregatedImageUrl, nodeData]);

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
      className="rounded-xl overflow-hidden w-80 shadow-sm"
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
          
          <div className="grid grid-cols-2 gap-2">
            {/* X Percent */}
            <div>
              <label className="block text-[10px] mb-0.5 opacity-70">X Pos</label>
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
                className="w-full px-2 py-1.5 text-xs rounded border bg-transparent"
                style={{ borderColor: "var(--border)" }}
              />
            </div>

            {/* Y Percent */}
            <div>
              <label className="block text-[10px] mb-0.5 opacity-70">Y Pos</label>
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
                className="w-full px-2 py-1.5 text-xs rounded border bg-transparent"
                style={{ borderColor: "var(--border)" }}
              />
            </div>

            {/* Width Percent */}
            <div>
              <label className="block text-[10px] mb-0.5 opacity-70">Width</label>
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
                className="w-full px-2 py-1.5 text-xs rounded border bg-transparent"
                style={{ borderColor: "var(--border)" }}
              />
            </div>

            {/* Height Percent */}
            <div>
              <label className="block text-[10px] mb-0.5 opacity-70">Height</label>
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
                className="w-full px-2 py-1.5 text-xs rounded border bg-transparent"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          </div>
        </div>

        {/* Preview Info */}
        {aggregatedImageUrl && (
          <div
            className="mt-2 p-2 rounded text-[10px] bg-opacity-50"
            style={{ backgroundColor: "var(--hover)" }}
          >
            <div>Crop: {nodeData.xPercent}%, {nodeData.yPercent}%</div>
            <div>Size: {nodeData.widthPercent}% × {nodeData.heightPercent}%</div>
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={status === "running" || (!aggregatedImageUrl && !nodeData.imageUrl)}
          className={`w-full mt-3 px-3 py-2 text-xs font-medium rounded flex items-center justify-center gap-2 transition-colors ${
            status === "running" || (!aggregatedImageUrl && !nodeData.imageUrl)
              ? "opacity-50 cursor-not-allowed bg-gray-200 text-gray-500"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {status === "running" ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              <span>Run Crop</span>
            </>
          )}
        </button>

        {/* Result Display */}
        {outputUrl && (
          <div 
            className="mt-3 border rounded overflow-hidden"
            style={{
              borderColor: status === "failed" ? "var(--danger)" : "var(--success)",
              backgroundColor: "var(--bg)",
            }}
          >
            <button
              onClick={() => setIsOutputExpanded(!isOutputExpanded)}
              className="w-full px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors"
              style={{
                backgroundColor: status === "failed" ? "var(--danger)" : "var(--success)",
                color: "white",
              }}
            >
              <span>{status === "failed" ? "✗ Error" : "✓ Result"}</span>
              {isOutputExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {isOutputExpanded && (
              <div className="p-0 bg-black/5">
                 {status === "failed" ? (
                   <div className="p-3 text-xs text-red-500 break-words">{outputUrl}</div>
                 ) : (
                   <>
                     <div className="relative w-full aspect-video group">
                        <img 
                          src={outputUrl} 
                          alt="Cropped result" 
                          className="w-full h-full object-contain"
                        />
                        <a 
                          href={outputUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                        >
                          Open Original
                        </a>
                     </div>
                     <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
                       <label className="block text-[10px] uppercase tracking-wider mb-1 opacity-70">Image URL</label>
                       <input 
                         readOnly
                         type="text" 
                         value={outputUrl}
                         onClick={(e) => e.currentTarget.select()}
                         className="w-full px-2 py-1 text-[10px] rounded bg-transparent border focus:outline-none"
                         style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                       />
                     </div>
                   </>
                 )}
              </div>
            )}
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
