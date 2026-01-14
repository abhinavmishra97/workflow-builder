import type { Node, Edge } from "reactflow";

export type NodeExecutionStatus = "idle" | "running" | "success" | "failed";

export type NodeResult = {
  nodeId: string;
  output: unknown;
  timestamp: number;
  error?: string;
};

export type WorkflowState = {
  nodes: Node[];
  edges: Edge[];
  nodeStatus: Record<string, NodeExecutionStatus>;
  nodeResults: Record<string, NodeResult>;
  selectedNodes: string[];
};
