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
  workflowId: string | null;
  setWorkflowId: (id: string) => void;
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
  workflowId: null,
  setWorkflowId: (id) => set({ workflowId: id }),

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

    const workflowId = state.workflowId;
    let dbRunId: string | null = null;
    let localRunId = `Run #${Date.now()}`;
    const startTime = Date.now();

    // 1. Create run in DB if workflow is saved
    if (workflowId) {
      try {
        const res = await fetch("/api/workflow/create-run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId,
            nodes: state.nodes,
            scope: "full",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          dbRunId = data.runId;
          // Optionally use the DB ID as the local ID, or keep them separate. 
          // Using DB ID ensures consistency if we reload.
          localRunId = data.runId;
        }
      } catch (err) {
        console.error("Failed to create DB run:", err);
      }
    }

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
      runId: localRunId,
      scope: "full",
      status: "running",
      startedAt: startTime,
      nodeResults: [],
      totalNodes: state.nodes.length,
      successfulNodes: 0,
      failedNodes: 0,
    });

    try {
      // Clear previous results before starting
      set({ nodeResults: {} });

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
        setNodeResult: async (nodeId, result) => {
          get().setNodeResult(nodeId, result);

          // Update node result in history
          const nodeResult = nodeExecutionResults.find(r => r.nodeId === nodeId);
          if (nodeResult) {
            nodeResult.output = result.output;
          }

          // Persist node success to DB
          if (dbRunId && nodeResult) {
            const node = state.nodes.find(n => n.id === nodeId);
            try {
              await fetch("/api/workflow/update-node", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  runId: dbRunId,
                  nodeId,
                  nodeType: nodeResult.nodeType,
                  nodeName: nodeResult.nodeName,
                  status: "success",
                  output: result.output,
                }),
              });
            } catch (err) {
              console.error("Failed to persist node result:", err);
            }
          }
        },
        onNodeError: async (nodeId: string, error: Error) => {
          // Update store with error so it shows on the node
          get().setNodeResult(nodeId, {
            output: error.message,
            timestamp: Date.now(),
          });

          let nodeResult = nodeExecutionResults.find(r => r.nodeId === nodeId);

          if (!nodeResult) {
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

          // Persist node error to DB
          if (dbRunId && nodeResult) {
            try {
              await fetch("/api/workflow/update-node", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  runId: dbRunId,
                  nodeId,
                  nodeType: nodeResult?.nodeType,
                  nodeName: nodeResult?.nodeName,
                  status: "failed",
                  error: error.message,
                }),
              });
            } catch (err) {
              console.error("Failed to persist node error:", err);
            }
          }
        },
        onWorkflowComplete: async () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const successfulNodes = nodeExecutionResults.filter(r => r.status === "success").length;
          const failedNodes = nodeExecutionResults.filter(r => r.status === "failed").length;

          // Update run in history
          historyStore.updateRun(localRunId, {
            status: failedNodes > 0 ? "partial" : "success",
            completedAt: endTime,
            duration,
            nodeResults: nodeExecutionResults,
            successfulNodes,
            failedNodes,
          });

          // Complete run in DB
          if (dbRunId) {
            try {
              await fetch("/api/workflow/complete-run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  runId: dbRunId,
                  status: failedNodes > 0 ? "partial" : "success",
                }),
              });
            } catch (err) {
              console.error("Failed to complete DB run:", err);
            }
          }

          set({ isExecuting: false });
        },
        onWorkflowError: async (error) => {
          console.error("Workflow execution error:", error);
          const endTime = Date.now();
          const duration = endTime - startTime;
          const successfulNodes = nodeExecutionResults.filter(r => r.status === "success").length;
          const failedNodes = nodeExecutionResults.filter(r => r.status === "failed").length;

          // Update run in history
          historyStore.updateRun(localRunId, {
            status: "failed",
            completedAt: endTime,
            duration,
            nodeResults: nodeExecutionResults,
            successfulNodes,
            failedNodes,
          });

          // Fail run in DB
          if (dbRunId) {
            try {
              await fetch("/api/workflow/complete-run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  runId: dbRunId,
                  status: "failed",
                }),
              });
            } catch (err) {
              console.error("Failed to complete DB run (error):", err);
            }
          }

          set({ isExecuting: false });
        },
      });
    } catch (error) {
      console.error("Workflow execution failed:", error);

      const { CycleError } = await import("@/lib/dag");

      if (error instanceof CycleError) {
        console.warn("Cycle detected:", error.cycle);
      }

      set({ isExecuting: false });

      // Also ensure DB run is failed if top-level crash
      // Note: onWorkflowError above might be called by runWorkflow's catch, 
      // but if not, we do best effort here.
      if (dbRunId) {
        try {
          await fetch("/api/workflow/complete-run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              runId: dbRunId,
              status: "failed",
            }),
          });
        } catch (e) { }
      }

      throw error;
    }
  },
}));
