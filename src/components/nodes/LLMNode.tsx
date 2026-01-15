"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";
import { ChevronDown, ChevronUp, Play, Loader2 } from "lucide-react";

export type LLMNodeData = {
  model: string;
  systemPrompt: string;
  userMessage: string;
  label?: string;
};

const AVAILABLE_MODELS = [
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { value: "gemini-pro", label: "Gemini Pro" },
];

function LLMNode({ id, data, selected }: NodeProps<LLMNodeData>) {
  const { nodeResults, nodeStatus, updateNode, setNodeStatus } = useWorkflowStore();
  const { getEdges, getNodes } = useReactFlow();
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);

  // Ensure data exists with defaults
  const nodeData: LLMNodeData = {
    model: data?.model ?? "gemini-1.5-pro",
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

    return {
      systemPrompt:
        systemPromptFromResults.join("\n") || systemPromptValues.join("\n") || nodeData.systemPrompt,
      userMessage:
        userMessageFromResults.join("\n") || userMessageValues.join("\n") || nodeData.userMessage,
      images: imagesFromResults.length > 0 ? imagesFromResults : imageUrls,
    };
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

  const handleRun = useCallback(() => {
    // Set loading state (no actual execution yet)
    setNodeStatus(id, "running");
    
    // Simulate running state - in real implementation, this would trigger execution
    // For now, we'll just set it to running and it will stay there until manually reset
  }, [id, setNodeStatus]);

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
      className={`px-4 py-3 shadow-lg rounded-lg bg-white border-2 min-w-[300px] max-w-[400px] ${getBorderColor()}`}
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

        {/* Model Selector */}
        <div className="mb-2">
          <select
            value={nodeData.model}
            onChange={handleModelChange}
            disabled={isRunning}
            className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* System Prompt Input */}
        <div className="mb-2">
          <label className="block text-xs text-gray-600 mb-1">System Prompt (optional)</label>
          <Handle
            type="target"
            position={Position.Left}
            id="system_prompt"
            className="w-3 h-3 bg-gray-400!"
            style={{ top: "30%" }}
          />
          <textarea
            value={hasSystemPromptConnection ? aggregatedInputs.systemPrompt : nodeData.systemPrompt}
            onChange={handleSystemPromptChange}
            disabled={hasSystemPromptConnection || isRunning}
            placeholder="Enter system prompt..."
            className={`w-full px-2 py-1.5 text-xs border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasSystemPromptConnection || isRunning
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-white text-gray-900"
            }`}
            rows={2}
          />
        </div>

        {/* User Message Input */}
        <div className="mb-2">
          <label className="block text-xs text-gray-600 mb-1">
            User Message <span className="text-red-500">*</span>
          </label>
          <Handle
            type="target"
            position={Position.Left}
            id="user_message"
            className="w-3 h-3 !bg-gray-400"
            style={{ top: "55%" }}
          />
          <textarea
            value={hasUserMessageConnection ? aggregatedInputs.userMessage : nodeData.userMessage}
            onChange={handleUserMessageChange}
            disabled={hasUserMessageConnection || isRunning}
            placeholder="Enter user message..."
            className={`w-full px-2 py-1.5 text-xs border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasUserMessageConnection || isRunning
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-white text-gray-900"
            }`}
            rows={3}
          />
        </div>

        {/* Images Input */}
        <div className="mb-2">
          <label className="block text-xs text-gray-600 mb-1">Images (optional)</label>
          <Handle
            type="target"
            position={Position.Left}
            id="images"
            className="w-3 h-3 bg-gray-400!"
            style={{ top: "80%" }}
          />
          {hasImageConnections && aggregatedInputs.images.length > 0 ? (
            <div className="px-2 py-1.5 text-xs border rounded bg-gray-100 text-gray-500">
              {aggregatedInputs.images.length} image(s) connected
            </div>
          ) : (
            <div className="px-2 py-1.5 text-xs border rounded bg-gray-50 text-gray-400">
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

        {/* Output Area */}
        {outputText && (
          <div className="mt-2 border rounded">
            <button
              onClick={() => setIsOutputExpanded(!isOutputExpanded)}
              className="w-full px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 flex items-center justify-between rounded-t"
            >
              <span>Output</span>
              {isOutputExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {isOutputExpanded && (
              <div className="px-2 py-2 text-xs text-gray-700 bg-white max-h-48 overflow-y-auto rounded-b">
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
