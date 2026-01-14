"use client";

import { useCallback, useMemo } from "react";
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

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
  maxZoom: 1.5,
};

const nodeTypes = {
  text: TextNode,
};

export default function WorkflowCanvas() {
  const { nodes, edges, setNodes, setEdges, connectNodes } = useWorkflowStore();

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

  return (
    <div className="h-screen w-full">
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
        <Background
          patternId="dots"
          gap={20}
          size={1}
          color="#e5e7eb"
          className="opacity-50"
        />
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
