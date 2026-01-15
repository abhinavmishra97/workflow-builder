"use client";

import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";

export type TextNodeData = {
  value: string;
  label?: string;
};

function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const { updateNode, nodeStatus } = useWorkflowStore();
  const { getEdges } = useReactFlow();
  
  const status = nodeStatus[id] || "idle";

  // Ensure data exists with defaults
  const nodeData: TextNodeData = {
    value: data?.value ?? "",
    label: data?.label ?? "Text",
  };

  // Check if input handle is connected using React Flow API
  const edges = getEdges();
  const hasInputConnection = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "input"
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      updateNode(id, {
        data: {
          ...nodeData,
          value: newValue,
        },
      });
    },
    [id, nodeData, updateNode]
  );

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
        <textarea
          value={nodeData.value}
          onChange={handleChange}
          disabled={hasInputConnection}
          placeholder="Enter text..."
          className={`w-full px-2 py-1.5 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasInputConnection
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-white text-gray-900"
          }`}
          rows={3}
        />
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

export default memo(TextNode);
