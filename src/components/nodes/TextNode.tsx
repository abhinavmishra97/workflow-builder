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
      className="rounded-xl overflow-hidden min-w-[220px]"
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
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-3 h-3"
          style={{ backgroundColor: "var(--text-muted)" }}
        />
        <textarea
          value={nodeData.value}
          onChange={handleChange}
          disabled={hasInputConnection}
          placeholder="Enter text..."
          className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none transition-all"
          style={{
            backgroundColor: hasInputConnection ? "var(--hover)" : "var(--bg)",
            color: hasInputConnection ? "var(--text-muted)" : "var(--text-primary)",
            border: "1px solid var(--border)",
            cursor: hasInputConnection ? "not-allowed" : "text",
          }}
          rows={3}
        />
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

export default memo(TextNode);
