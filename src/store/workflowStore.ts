import { create } from "zustand";
import type { Node, Edge, Connection } from "reactflow";
import type {
  NodeExecutionStatus,
  NodeResult,
  WorkflowState,
} from "@/types/workflow";
import { runWorkflow, resetWorkflowStatus } from "@/lib/workflowExecutor";

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

    // Reset all statuses to idle first
    resetWorkflowStatus(state.nodes, state.setNodeStatus);

    set({ isExecuting: true });

    try {
      await runWorkflow(state.nodes, state.edges, {
        setNodeStatus: (nodeId, status) => {
          get().setNodeStatus(nodeId, status);
        },
        setNodeResult: (nodeId, result) => {
          get().setNodeResult(nodeId, {
            output: result,
            timestamp: Date.now(),
          });
        },
        onWorkflowComplete: () => {
          set({ isExecuting: false });
        },
        onWorkflowError: (error) => {
          console.error("Workflow execution error:", error);
          set({ isExecuting: false });
        },
      });
    } catch (error) {
      console.error("Workflow execution failed:", error);
      set({ isExecuting: false });
      throw error;
    }
  },
}));
