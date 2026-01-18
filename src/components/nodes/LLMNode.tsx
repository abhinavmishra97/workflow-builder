"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { ChevronDown, ChevronUp, Play, Loader2 } from "lucide-react";

// export type LLMNodeData = {
//   model: string;
//   systemPrompt: string;
//   userMessage: string;
//   label?: string;
// };
export type LLMNodeData = {
  /** Gemini / LLM model */
  model: string;

  /** Optional system instruction */
  systemPrompt?: string;

  /** User message (can come from Text node) */
  userMessage?: string;

  /** Image inputs connected to this node */
  imageUrls?: string[];

  /** Optional display label */
  label?: string;
};


const AVAILABLE_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
];


function LLMNode({ id, data, selected }: NodeProps<LLMNodeData>) {
  const { nodeResults, nodeStatus, updateNode, setNodeStatus } = useWorkflowStore();
  const { getEdges, getNodes } = useReactFlow();
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);

  // Ensure data exists with defaults
  const SAFE_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;

  const nodeData: LLMNodeData = {
    model: SAFE_MODELS.includes(data?.model as any)
      ? data.model
      : "gemini-2.5-flash",
    systemPrompt: data?.systemPrompt ?? "",
    userMessage: data?.userMessage ?? "",
    label: data?.label ?? "LLM",
  };

  const status = nodeStatus[id] || "idle";
  const result = nodeResults[id];
  const outputText = typeof result?.output === "string" ? result.output : "";
  const isRunning = status === "running";

  // Check which handles are connected using React Flow API
  const edges = getEdges();
  const hasSystemPromptConnection = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "system_prompt"
  );
  const hasUserMessageConnection = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "user_message"
  );
  const hasImageConnections = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "images"
  );

  // Aggregate input values from connected nodes
  const aggregatedInputs = useMemo(() => {
    const systemPromptEdges = edges.filter(
      (edge) => edge.target === id && edge.targetHandle === "system_prompt"
    );
    const userMessageEdges = edges.filter(
      (edge) => edge.target === id && edge.targetHandle === "user_message"
    );
    const imageEdges = edges.filter(
      (edge) => edge.target === id && edge.targetHandle === "images"
    );

    // Get system prompt from connected nodes
    const allNodes = getNodes();
    const systemPromptValues = systemPromptEdges
      .map((edge) => {
        const sourceNode = allNodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === "text") {
          return (sourceNode.data as { value?: string })?.value || "";
        }
        return "";
      })
      .filter((v) => v.length > 0);

    // Get user message from connected nodes
    const userMessageValues = userMessageEdges
      .map((edge) => {
        const sourceNode = allNodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === "text") {
          return (sourceNode.data as { value?: string })?.value || "";
        }
        return "";
      })
      .filter((v) => v.length > 0);

    // Get image URLs from connected nodes
    const imageUrls = imageEdges
      .map((edge) => {
        const sourceNode = allNodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === "uploadImage") {
          const imageData = sourceNode.data as { imageUrl?: string | null };
          return imageData?.imageUrl || null;
        }
        return null;
      })
      .filter((url): url is string => url !== null);

    // Also check nodeResults for outputs
    const systemPromptFromResults = systemPromptEdges
      .map((edge) => {
        const result = nodeResults[edge.source];
        if (result && typeof result.output === "string") {
          return result.output;
        }
        return "";
      })
      .filter((v) => v.length > 0);

    const userMessageFromResults = userMessageEdges
      .map((edge) => {
        const result = nodeResults[edge.source];
        if (result && typeof result.output === "string") {
          return result.output;
        }
        return "";
      })
      .filter((v) => v.length > 0);

    const imagesFromResults = imageEdges
      .map((edge) => {
        const result = nodeResults[edge.source];
        if (result && typeof result.output === "string") {
          return result.output;
        }
        return null;
      })
      .filter((url): url is string => url !== null);

    const finalInputs = {
      systemPrompt:
        systemPromptFromResults.join("\n") || systemPromptValues.join("\n") || nodeData.systemPrompt,
      userMessage:
        userMessageFromResults.join("\n") || userMessageValues.join("\n") || nodeData.userMessage,
      images: imagesFromResults.length > 0 ? imagesFromResults : imageUrls,
    };

    console.log("[LLM Node] Aggregated inputs calculated:", {
      systemPromptEdges: systemPromptEdges.length,
      userMessageEdges: userMessageEdges.length,
      imageEdges: imageEdges.length,
      finalInputs,
    });

    return finalInputs;
  }, [edges, getNodes, nodeResults, id, nodeData.systemPrompt, nodeData.userMessage]);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNode(id, {
        data: {
          ...nodeData,
          model: e.target.value,
        },
      });
    },
    [id, nodeData, updateNode]
  );

  const handleSystemPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNode(id, {
        data: {
          ...nodeData,
          systemPrompt: e.target.value,
        },
      });
    },
    [id, nodeData, updateNode]
  );

  const handleUserMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNode(id, {
        data: {
          ...nodeData,
          userMessage: e.target.value,
        },
      });
    },
    [id, nodeData, updateNode]
  );

  const handleRun = useCallback(async () => {
    console.log("[LLM Node] Starting execution...");
    console.log("[LLM Node] Aggregated inputs:", aggregatedInputs);
    console.log("[LLM Node] Node data:", nodeData);
    
    // Set loading state
    setNodeStatus(id, "running");
    
    try {
      // Get the user message (from connected node or direct input)
      const userMessage = aggregatedInputs.userMessage || nodeData.userMessage;
      
      if (!userMessage?.trim()) {
        throw new Error("User message is required");
      }

      const requestBody = {
        systemPrompt: aggregatedInputs.systemPrompt || nodeData.systemPrompt || undefined,
        userMessage: userMessage.trim(),
        model: nodeData.model || "gemini-2.5-flash",
        imageUrls: aggregatedInputs.images.length > 0 ? aggregatedInputs.images : undefined,
      };

      console.log("[LLM Node] Request body:", requestBody);

      // Call the LLM API
      const response = await fetch("/api/trigger/execute-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("[LLM Node] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[LLM Node] Response error:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("[LLM Node] Response result:", result);

      if (!result.success) {
        throw new Error(result.error || "LLM execution failed");
      }

      // Store the result
      useWorkflowStore.getState().setNodeResult(id, {
        output: result.output,
        timestamp: Date.now(),
      });

      setNodeStatus(id, "success");
      console.log("[LLM Node] Execution successful");
    } catch (error) {
      console.error("[LLM Node] Execution error:", error);
      setNodeStatus(id, "failed");
      
      // Show error in result
      const errorMessage = error instanceof Error ? error.message : "Execution failed";
      useWorkflowStore.getState().setNodeResult(id, {
        output: `Error: ${errorMessage}`,
        timestamp: Date.now(),
      });
    }
  }, [id, setNodeStatus, aggregatedInputs, nodeData]);

  // Get status styling
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
    return {
      borderColor: "var(--border)",
      boxShadow: "none",
    };
  };

  const statusStyle = getStatusStyle();

  return (
    <div
      className="rounded-xl overflow-hidden min-w-[320px] max-w-[400px]"
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
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--success)" }}
          />
        )}
        {status === "failed" && (
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--danger)" }}
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4">

        {/* Model Selector */}
        <div className="mb-3">
          <select
            value={nodeData.model}
            onChange={handleModelChange}
            disabled={isRunning}
            className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none transition-all"
            style={{
              backgroundColor: "var(--bg)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              cursor: isRunning ? "not-allowed" : "pointer",
            }}
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* User Message Input - PRIMARY INPUT (moved to first position) */}
        <div className="mb-3">
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
            User Message <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <Handle
            type="target"
            position={Position.Left}
            id="user_message"
            className="w-3 h-3 !bg-gray-400"
            style={{ top: "30%" }}
          />
          <textarea
            value={hasUserMessageConnection ? aggregatedInputs.userMessage : nodeData.userMessage}
            onChange={handleUserMessageChange}
            disabled={hasUserMessageConnection || isRunning}
            placeholder="Enter user message..."
            className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none transition-all"
            style={{
              backgroundColor: hasUserMessageConnection || isRunning ? "var(--hover)" : "var(--bg)",
              color: hasUserMessageConnection || isRunning ? "var(--text-muted)" : "var(--text-primary)",
              border: "1px solid var(--border)",
              cursor: hasUserMessageConnection || isRunning ? "not-allowed" : "text",
            }}
            rows={3}
          />
        </div>

        {/* System Prompt Input - OPTIONAL (moved to second position) */}
        <div className="mb-3">
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>System Prompt (optional)</label>
          <Handle
            type="target"
            position={Position.Left}
            id="system_prompt"
            className="w-3 h-3"
            style={{ backgroundColor: "var(--text-muted)", top: "55%" }}
          />
          <textarea
            value={hasSystemPromptConnection ? aggregatedInputs.systemPrompt : nodeData.systemPrompt}
            onChange={handleSystemPromptChange}
            disabled={hasSystemPromptConnection || isRunning}
            placeholder="Enter system prompt..."
            className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none transition-all"
            style={{
              backgroundColor: hasSystemPromptConnection || isRunning ? "var(--hover)" : "var(--bg)",
              color: hasSystemPromptConnection || isRunning ? "var(--text-muted)" : "var(--text-primary)",
              border: "1px solid var(--border)",
              cursor: hasSystemPromptConnection || isRunning ? "not-allowed" : "text",
            }}
            rows={2}
          />
        </div>

        {/* Images Input */}
        <div className="mb-3">
          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Images (optional)</label>
          <Handle
            type="target"
            position={Position.Left}
            id="images"
            className="w-3 h-3"
            style={{ backgroundColor: "var(--purple-glow)", top: "80%" }}
          />
          {hasImageConnections ? (
            <div
              className="px-3 py-2 text-xs rounded-lg"
              style={{
                backgroundColor: "var(--hover)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {aggregatedInputs.images.length > 0 ? (
                <div>
                  <div className="font-semibold mb-1">{aggregatedInputs.images.length} image(s) connected</div>
                  {aggregatedInputs.images.map((url, idx) => (
                    <div key={idx} className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {url}
                    </div>
                  ))}
                </div>
              ) : (
                <div>Image connected (waiting for upload...)</div>
              )}
            </div>
          ) : (
            <div
              className="px-3 py-2 text-xs rounded-lg"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              No images connected
            </div>
          )}
        </div>

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={isRunning || (!aggregatedInputs.userMessage && !nodeData.userMessage)}
          className={`w-full px-3 py-2 text-sm font-medium rounded flex items-center justify-center gap-2 transition-colors ${
            isRunning || (!aggregatedInputs.userMessage && !nodeData.userMessage)
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Run</span>
            </>
          )}
        </button>

        {/* Result Display - Shows directly on the node */}
        {outputText && (
          <div 
            className="mt-3 border rounded-lg overflow-hidden"
            style={{
              borderColor: "var(--success)",
              backgroundColor: "var(--bg)",
            }}
          >
            <button
              onClick={() => setIsOutputExpanded(!isOutputExpanded)}
              className="w-full px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors"
              style={{
                backgroundColor: "var(--success)",
                color: "white",
              }}
            >
              <span>✓ Result</span>
              {isOutputExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {isOutputExpanded && (
              <div 
                className="px-3 py-2 text-xs max-h-48 overflow-y-auto"
                style={{
                  color: "var(--text-primary)",
                  backgroundColor: "var(--card)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {outputText}
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
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
}

export default memo(LLMNode);
