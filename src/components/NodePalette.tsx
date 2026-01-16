"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import {
  Type,
  Image,
  Video,
  Crop,
  Film,
  Sparkles,
} from "lucide-react";
import {
  createTextNode,
  createUploadImageNode,
  createUploadVideoNode,
  createLLMNode,
  createCropImageNode,
  createExtractFrameNode,
} from "@/lib/nodeHelpers";

const nodeTypes = [
  {
    type: "text",
    label: "Text",
    icon: Type,
    createNode: (id: string, position: { x: number; y: number }) =>
      createTextNode(id, position),
  },
  {
    type: "uploadImage",
    label: "Upload Image",
    icon: Image,
    createNode: (id: string, position: { x: number; y: number }) =>
      createUploadImageNode(id, position),
  },
  {
    type: "uploadVideo",
    label: "Upload Video",
    icon: Video,
    createNode: (id: string, position: { x: number; y: number }) =>
      createUploadVideoNode(id, position),
  },
  {
    type: "cropImage",
    label: "Crop Image",
    icon: Crop,
    createNode: (id: string, position: { x: number; y: number }) =>
      createCropImageNode(id, position),
  },
  {
    type: "extractFrame",
    label: "Extract Frame",
    icon: Film,
    createNode: (id: string, position: { x: number; y: number }) =>
      createExtractFrameNode(id, position),
  },
  {
    type: "llm",
    label: "LLM",
    icon: Sparkles,
    createNode: (id: string, position: { x: number; y: number }) =>
      createLLMNode(id, position),
  },
] as const;

export default function NodePalette() {
  const { addNode } = useWorkflowStore();

  const handleAddNode = useCallback(
    (
      nodeType: string,
      createNodeFn: (id: string, position: { x: number; y: number }) => any
    ) => {
      const id = `${nodeType}-${Date.now()}`;
      // Default position - spread nodes around center
      const position = { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 };
      const newNode = createNodeFn(id, position);
      addNode(newNode);
    },
    [addNode]
  );

  return (
    <div
      className="h-full flex flex-col py-4 border-r"
      style={{
        width: "64px",
        backgroundColor: "var(--sidebar)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex flex-col gap-2 px-2">
        {nodeTypes.map((nodeType) => {
          const Icon = nodeType.icon;
          return (
            <button
              key={nodeType.type}
              onClick={() => handleAddNode(nodeType.type, nodeType.createNode)}
              className="group relative w-12 h-12 rounded-lg flex items-center justify-center transition-all"
              style={{
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              title={nodeType.label}
            >
              <Icon className="w-5 h-5" />
              
              {/* Tooltip */}
              <div
                className="absolute left-full ml-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
                style={{
                  backgroundColor: "var(--card)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {nodeType.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
