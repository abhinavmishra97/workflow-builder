"use client";

import { useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type ReactFlowInstance,
  type FitViewOptions,
  type Connection,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "@/store/workflowStore";
import TextNode, { type TextNodeData } from "@/components/nodes/TextNode";
import UploadImageNode from "@/components/nodes/UploadImageNode";
import UploadVideoNode from "@/components/nodes/UploadVideoNode";
import LLMNode from "@/components/nodes/LLMNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";
import NodePalette from "@/components/NodePalette";

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
  maxZoom: 1.5,
};

const nodeTypes = {
  text: TextNode,
  uploadImage: UploadImageNode,
  uploadVideo: UploadVideoNode,
  llm: LLMNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

export default function WorkflowCanvas() {
  const { nodes, edges, setNodes, setEdges, connectNodes, executeWorkflow, isExecuting } =
    useWorkflowStore();

  const onInit = useCallback((reactFlowInstance: ReactFlowInstance) => {
    reactFlowInstance.fitView(fitViewOptions);
  }, []);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);
    },
    [nodes, setNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      setEdges(updatedEdges);
    },
    [edges, setEdges]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      connectNodes(connection);
    },
    [connectNodes]
  );

  const handleRunWorkflow = useCallback(async () => {
    try {
      await executeWorkflow();
    } catch (error) {
      console.error("Workflow execution error:", error);
    }
  }, [executeWorkflow]);

  return (
    <div className="h-screen w-full relative">
      <NodePalette />
      {/* Run Workflow Button */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <button
          onClick={handleRunWorkflow}
          disabled={isExecuting || nodes.length === 0}
          className={`px-4 py-2 rounded-lg font-medium shadow-lg transition-all ${
            isExecuting
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : nodes.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
          }`}
        >
          {isExecuting ? "Running..." : "Run Workflow"}
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor="#3b82f6"
          nodeStrokeWidth={3}
          nodeStrokeColor="#60a5fa"
          maskColor="rgba(59, 130, 246, 0.3)"
          maskStrokeColor="#3b82f6"
          maskStrokeWidth={2}
          position="bottom-right"
          pannable
          zoomable
          style={{
            backgroundColor: "#1f2937",
            border: "2px solid #4b5563",
          }}
        />
      </ReactFlow>
    </div>
  );
}
