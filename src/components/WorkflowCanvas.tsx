"use client";

import { useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type ReactFlowInstance,
  type FitViewOptions,
} from "reactflow";
import "reactflow/dist/style.css";

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
  maxZoom: 1.5,
};

export default function WorkflowCanvas() {
  const onInit = useCallback((reactFlowInstance: ReactFlowInstance) => {
    reactFlowInstance.fitView(fitViewOptions);
  }, []);

  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        onInit={onInit}
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
          nodeStrokeWidth={2}
          position="bottom-right"
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
