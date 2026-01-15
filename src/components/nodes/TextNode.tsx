"use client";

import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { useWorkflowStore } from "@/store/workflowStore";

export type TextNodeData = {
  value: string;
  label?: string;
};

function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const { updateNode } = useWorkflowStore();
  const { getEdges } = useReactFlow();

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

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg bg-white border-2 min-w-[200px] ${
        selected ? "border-blue-500" : "border-gray-300"
      }`}
    >
      <div className="mb-2">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          {nodeData.label}
        </label>
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
