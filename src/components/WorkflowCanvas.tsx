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
import TextNode from "@/components/nodes/TextNode";
import UploadImageNode from "@/components/nodes/UploadImageNode";
import UploadVideoNode from "@/components/nodes/UploadVideoNode";
import LLMNode from "@/components/nodes/LLMNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";
import NodePalette from "@/components/NodePalette";
import { Play } from "lucide-react";

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
    <div className="h-screen w-full flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      {/* Top Bar */}
      <div
        className="h-14 flex items-center justify-between px-6 border-b"
        style={{
          backgroundColor: "var(--bg)",
          borderColor: "var(--border)",
        }}
      >
        {/* Workflow Name */}
        <div>
          <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Untitled Workflow
          </h1>
        </div>

        {/* Run Button */}
        <button
          onClick={handleRunWorkflow}
          disabled={isExecuting || nodes.length === 0}
          className="px-4 py-2 rounded-lg font-medium transition-all inline-flex items-center gap-2"
          style={{
            backgroundColor: isExecuting || nodes.length === 0 ? "var(--border)" : "var(--accent)",
            color: isExecuting || nodes.length === 0 ? "var(--text-muted)" : "#000000",
            cursor: isExecuting || nodes.length === 0 ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!isExecuting && nodes.length > 0) {
              e.currentTarget.style.opacity = "0.9";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <Play className="w-4 h-4" fill="currentColor" />
          {isExecuting ? "Running..." : "Run Workflow"}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <NodePalette />

        {/* Canvas */}
        <div className="flex-1 relative">
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
            proOptions={{ hideAttribution: true }}
          >
            <Background
              gap={24}
              size={1.5}
              color="var(--border)"
            />
            <Controls
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            />
            <MiniMap
              nodeStrokeWidth={2}
              position="bottom-right"
              pannable
              zoomable
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
