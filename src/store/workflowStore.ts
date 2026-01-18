import { create } from "zustand";
import type { Node, Edge, Connection } from "reactflow";
import type {
  NodeExecutionStatus,
  NodeResult,
  WorkflowState,
} from "@/types/workflow";
import { runWorkflow } from "@/lib/workflowExecutor";

interface WorkflowStore extends WorkflowState {
  // Actions
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  connectNodes: (connection: Connection) => void;
  deleteNode: (nodeId: string) => void;
  setNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  setNodeResult: (nodeId: string, result: Omit<NodeResult, "nodeId">) => void;
  // Additional helper actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  clearNodeResult: (nodeId: string) => void;
  resetWorkflow: () => void;
  // Execution actions
  executeWorkflow: () => Promise<void>;
  isExecuting: boolean;
}

const initialState: WorkflowState = {
  nodes: [],
  edges: [],
  nodeStatus: {},
  nodeResults: {},
  selectedNodes: [],
};

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  ...initialState,
  isExecuting: false,

  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
      nodeStatus: {
        ...state.nodeStatus,
        [node.id]: "idle",
      },
    }));
  },

  updateNode: (nodeId, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
    }));
  },

  connectNodes: (connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    console.log('[connectNodes] Creating connection:', {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle
    });

    const edge: Edge = {
      id: `${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle || null,
      targetHandle: connection.targetHandle || null,
      type: "smoothstep",
    };

    set((state) => {
      // Check if edge already exists
      const edgeExists = state.edges.some(
        (e) =>
          e.source === edge.source &&
          e.target === edge.target &&
          e.sourceHandle === edge.sourceHandle &&
          e.targetHandle === edge.targetHandle
      );

      if (edgeExists) {
        return state;
      }

      return {
        edges: [...state.edges, edge],
      };
    });
  },

  deleteNode: (nodeId) => {
    set((state) => {
      const { nodeStatus, nodeResults } = state;
      const newStatus = { ...nodeStatus };
      const newResults = { ...nodeResults };

      // Remove status and results for deleted node
      delete newStatus[nodeId];
      delete newResults[nodeId];

      return {
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        ),
        nodeStatus: newStatus,
        nodeResults: newResults,
        selectedNodes: state.selectedNodes.filter((id) => id !== nodeId),
      };
    });
  },

  setNodeStatus: (nodeId, status) => {
    set((state) => ({
      nodeStatus: {
        ...state.nodeStatus,
        [nodeId]: status,
      },
    }));
  },

  setNodeResult: (nodeId, result) => {
    set((state) => ({
      nodeResults: {
        ...state.nodeResults,
        [nodeId]: {
          nodeId,
          ...result,
        },
      },
    }));
  },

  setNodes: (nodes) => {
    set({ nodes });
  },

  setEdges: (edges) => {
    set({ edges });
  },

  setSelectedNodes: (nodeIds) => {
    set({ selectedNodes: nodeIds });
  },

  clearNodeResult: (nodeId) => {
    set((state) => {
      const newResults = { ...state.nodeResults };
      delete newResults[nodeId];
      return { nodeResults: newResults };
    });
  },

  resetWorkflow: () => {
    set(initialState);
  },

  executeWorkflow: async () => {
    const state = get();

    // Don't execute if already running
    if (state.isExecuting) {
      return;
    }

    set({ isExecuting: true });

    // Import history store dynamically to avoid circular deps
    const { useWorkflowHistoryStore } = await import("@/store/workflowHistoryStore");
    const historyStore = useWorkflowHistoryStore.getState();

    // Create new run
    const runId = `Run #${Date.now()}`;
    const startTime = Date.now();
    const nodeExecutionResults: Array<{
      nodeId: string;
      nodeType: string;
      nodeName: string;
      status: "success" | "failed" | "running";
      startedAt: number;
      completedAt?: number;
      duration?: number;
      output?: unknown;
      error?: string;
    }> = [];

    // Add initial run to history
    historyStore.addRun({
      runId,
      scope: "full",
      status: "running",
      startedAt: startTime,
      nodeResults: [],
      totalNodes: state.nodes.length,
      successfulNodes: 0,
      failedNodes: 0,
    });

    try {
      await runWorkflow(state.nodes, state.edges, {
        setNodeStatus: (nodeId, status) => {
          get().setNodeStatus(nodeId, status);

          // Track node execution (skip idle status)
          if (status === "idle") return;

          const node = state.nodes.find(n => n.id === nodeId);
          if (!node) return;

          const existingResult = nodeExecutionResults.find(r => r.nodeId === nodeId);

          if (status === "running" && !existingResult) {
            nodeExecutionResults.push({
              nodeId,
              nodeType: node.type || "unknown",
              nodeName: (node.data as any)?.label || node.type || "Node",
              status: "running",
              startedAt: Date.now(),
            });
          } else if (existingResult) {
            existingResult.status = status;
            if (status !== "running") {
              existingResult.completedAt = Date.now();
              existingResult.duration = existingResult.completedAt - existingResult.startedAt;
            }
          }
        },
        setNodeResult: (nodeId, result) => {
          get().setNodeResult(nodeId, result);

          // Update node result in history
          const nodeResult = nodeExecutionResults.find(r => r.nodeId === nodeId);
          if (nodeResult) {
            nodeResult.output = result;
          }
        },
        onNodeError: (nodeId: string, error: Error) => {
          let nodeResult = nodeExecutionResults.find(r => r.nodeId === nodeId);

          if (!nodeResult) {
            // If node failed immediately (e.g. validaton error), it might not have an entry yet
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
              nodeResult = {
                nodeId,
                nodeType: node.type || "unknown",
                nodeName: (node.data as any)?.label || node.type || "Node",
                status: "failed",
                startedAt: Date.now(),
              };
              nodeExecutionResults.push(nodeResult);
            }
          }

          if (nodeResult) {
            nodeResult.error = error.message;
            nodeResult.status = "failed";
            nodeResult.completedAt = Date.now();
            nodeResult.duration = (nodeResult.completedAt || 0) - nodeResult.startedAt;
          }
        },
        onWorkflowComplete: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const successfulNodes = nodeExecutionResults.filter(r => r.status === "success").length;
          const failedNodes = nodeExecutionResults.filter(r => r.status === "failed").length;

          // Update run in history
          historyStore.updateRun(runId, {
            status: failedNodes > 0 ? "partial" : "success",
            completedAt: endTime,
            duration,
            nodeResults: nodeExecutionResults,
            successfulNodes,
            failedNodes,
          });

          set({ isExecuting: false });
        },
        onWorkflowError: (error) => {
          console.error("Workflow execution error:", error);
          const endTime = Date.now();
          const duration = endTime - startTime;
          const successfulNodes = nodeExecutionResults.filter(r => r.status === "success").length;
          const failedNodes = nodeExecutionResults.filter(r => r.status === "failed").length;

          // Update run in history
          historyStore.updateRun(runId, {
            status: "failed",
            completedAt: endTime,
            duration,
            nodeResults: nodeExecutionResults,
            successfulNodes,
            failedNodes,
          });

          set({ isExecuting: false });
        },
      });
    } catch (error) {
      console.error("Workflow execution failed:", error);

      const { CycleError } = await import("@/lib/dag");

      if (error instanceof CycleError) {
        // Optionally, you could mark specific nodes as part of the cycle here if the store supports it
        console.warn("Cycle detected:", error.cycle);
      }

      set({ isExecuting: false });

      // Ensure specific errors propagate to history
      // We manually trigger onWorkflowError from the runWorkflow callbacks, 
      // but if the error happens BEFORE runWorkflow (e.g. in import), we catch it here.
      // However, runWorkflow re-throws, so we end up here.
      // We need to ensure the HISTORY is updated with this top-level error if it wasn't already.

      // Since we passed `onWorkflowError` to `runWorkflow`, it should have already handled the history update.
      // But if it crashed before calling that callback (e.g. inside `getExecutionOrder`), we need to save it.

      // Let's rely on runWorkflow's `catch` block calling `onWorkflowError`.
      // But we re-throw to ensure the UI knows.
      throw error;
    }
  },
}));
