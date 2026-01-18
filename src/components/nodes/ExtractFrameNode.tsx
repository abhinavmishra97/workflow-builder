"use client";

import { memo, useCallback, useMemo, useState, useEffect } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { Film, Play, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export type ExtractFrameNodeData = {
  videoUrl: string | null;
  timestamp: string;
  label?: string;
};

function ExtractFrameNode({ id, data, selected }: NodeProps<ExtractFrameNodeData>) {
  const { nodeResults, updateNode, nodeStatus } = useWorkflowStore();
  const { getEdges, getNodes } = useReactFlow();
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);
  
  const status = nodeStatus[id] || "idle";
  const result = nodeResults[id];
  const outputUrl = typeof result?.output === "string" ? result.output : "";

  const nodeData: ExtractFrameNodeData = {
    videoUrl: data?.videoUrl ?? null,
    timestamp: data?.timestamp ?? "0",
    label: data?.label ?? "Extract Frame",
  };
  
  // Local state for timestamp to avoid continuous updates
  const [localTimestamp, setLocalTimestamp] = useState(nodeData.timestamp);

  useEffect(() => {
    setLocalTimestamp(nodeData.timestamp);
  }, [nodeData.timestamp]);

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
      const node = getNodes().find(n => n.id === id);
      if (!node) return;
      updateNode(id, {
        data: {
          ...node.data,
          videoUrl: e.target.value,
        },
      });
    },
    [id, getNodes, updateNode]
  );

  const updateTimestamp = useCallback((value: string) => {
      const node = getNodes().find(n => n.id === id);
      if (!node) return;
      updateNode(id, {
        data: {
          ...node.data,
          timestamp: value,
        },
      });
  }, [id, getNodes, updateNode]);

  const handleRun = useCallback(async () => {
    const videoUrl = aggregatedVideoUrl || nodeData.videoUrl;
    
    if (!videoUrl) {
      console.error("No video URL provided");
      return;
    }

    useWorkflowStore.getState().setNodeStatus(id, "running");

    // History tracking
    const { useWorkflowHistoryStore } = await import("@/store/workflowHistoryStore");
    const historyStore = useWorkflowHistoryStore.getState();
    const runId = `Run #${Date.now()}`;
    const startTime = Date.now();
    
    // Create initial history entry
    historyStore.addRun({
      runId,
      scope: "single",
      status: "running",
      startedAt: startTime,
      totalNodes: 1,
      successfulNodes: 0,
      failedNodes: 0,
      nodeResults: [],
      selectedNodeIds: [id]
    });

    try {
      const response = await fetch("/api/trigger/extract-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          timestamp: nodeData.timestamp,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Frame extraction failed");
      }

      useWorkflowStore.getState().setNodeResult(id, {
        output: result.extractedFrameUrl,
        timestamp: Date.now(),
      });

      useWorkflowStore.getState().setNodeStatus(id, "success");
      setIsOutputExpanded(true);

      // Update history on success
      const endTime = Date.now();
      const nodeResult = {
        nodeId: id,
        nodeType: "extractFrame",
        nodeName: nodeData.label || "Extract Frame",
        status: "success" as const,
        startedAt: startTime,
        completedAt: endTime,
        duration: endTime - startTime,
        output: result.extractedFrameUrl
      };

      historyStore.updateRun(runId, {
        status: "success",
        completedAt: endTime,
        duration: endTime - startTime,
        successfulNodes: 1,
        nodeResults: [nodeResult]
      });

    } catch (error) {
      console.error("[Extract Frame Node] Execution error:", error);
      useWorkflowStore.getState().setNodeStatus(id, "failed");
      
      const errorMessage = error instanceof Error ? error.message : "Execution failed";

      useWorkflowStore.getState().setNodeResult(id, {
        output: errorMessage,
        timestamp: Date.now(),
      });

      // Update history on failure
      const endTime = Date.now();
      const nodeResult = {
        nodeId: id,
        nodeType: "extractFrame",
        nodeName: nodeData.label || "Extract Frame",
        status: "failed" as const,
        startedAt: startTime,
        completedAt: endTime,
        duration: endTime - startTime,
        error: errorMessage
      };

      historyStore.updateRun(runId, {
        status: "failed",
        completedAt: endTime,
        duration: endTime - startTime,
        failedNodes: 1,
        nodeResults: [nodeResult]
      });
    }
  }, [id, aggregatedVideoUrl, nodeData]);

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
            style={{ backgroundColor: "var(--text-muted)", top: "20%" }}
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
            value={localTimestamp}
            onChange={(e) => setLocalTimestamp(e.target.value)}
            onBlur={() => updateTimestamp(localTimestamp)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    updateTimestamp(localTimestamp);
                    e.currentTarget.blur();
                }
            }}
            placeholder="0 or 50%"
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
            style={{
              backgroundColor: "var(--bg)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          />
          <div className="mt-1 text-[10px] opacity-70" style={{ color: "var(--text-secondary)" }}>
            Use '10' for 10s or '50%' for middle
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={status === "running" || (!aggregatedVideoUrl && !nodeData.videoUrl)}
          className={`w-full mt-3 px-3 py-2 text-xs font-medium rounded flex items-center justify-center gap-2 transition-colors ${
            status === "running" || (!aggregatedVideoUrl && !nodeData.videoUrl)
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
              <span>Extract Frame</span>
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
                          alt="Extracted frame" 
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
                       <label className="block text-[10px] uppercase tracking-wider mb-1 opacity-70">Frame URL</label>
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

export default memo(ExtractFrameNode);
