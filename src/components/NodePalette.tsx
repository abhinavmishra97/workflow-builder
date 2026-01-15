"use client";

import { useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
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
    createNode: (id: string, position: { x: number; y: number }) =>
      createTextNode(id, position),
  },
  {
    type: "uploadImage",
    label: "Upload Image",
    createNode: (id: string, position: { x: number; y: number }) =>
      createUploadImageNode(id, position),
  },
  {
    type: "uploadVideo",
    label: "Upload Video",
    createNode: (id: string, position: { x: number; y: number }) =>
      createUploadVideoNode(id, position),
  },
  {
    type: "cropImage",
    label: "Crop Image",
    createNode: (id: string, position: { x: number; y: number }) =>
      createCropImageNode(id, position),
  },
  {
    type: "extractFrame",
    label: "Extract Frame",
    createNode: (id: string, position: { x: number; y: number }) =>
      createExtractFrameNode(id, position),
  },
  {
    type: "llm",
    label: "LLM",
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
    <div className="absolute left-4 top-4 z-10 bg-white rounded-lg shadow-md border border-gray-300 p-3 min-w-[180px]">
      <h2 className="text-sm font-semibold mb-3 text-gray-700 uppercase tracking-wide">
        Nodes
      </h2>
      <div className="space-y-1.5">
        {nodeTypes.map((nodeType) => (
          <button
            key={nodeType.type}
            onClick={() => handleAddNode(nodeType.type, nodeType.createNode)}
            className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <span>{nodeType.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
