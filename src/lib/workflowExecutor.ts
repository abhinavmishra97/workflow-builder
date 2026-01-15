import type { Node, Edge } from "reactflow";
import { getExecutionOrder, CycleError } from "./dag";
import type { NodeExecutionStatus } from "@/types/workflow";

export type ExecutionCallbacks = {
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, result: unknown) => void;
  onNodeError?: (nodeId: string, error: Error) => void;
  onWorkflowComplete?: () => void;
  onWorkflowError?: (error: Error) => void;
  setNodeStatus?: (nodeId: string, status: NodeExecutionStatus) => void;
  setNodeResult?: (nodeId: string, result: unknown) => void;
};

/**
 * Builds a map of node IDs to their direct upstream dependencies (nodes that must complete first).
 */
function buildDependencyMap(nodes: Node[], edges: Edge[]): Map<string, string[]> {
  const dependencyMap = new Map<string, string[]>();

  // Initialize all nodes with empty arrays
  nodes.forEach((node) => {
    dependencyMap.set(node.id, []);
  });

  // Add dependencies from edges
  edges.forEach((edge) => {
    if (edge.source && edge.target) {
      const dependencies = dependencyMap.get(edge.target) || [];
      dependencies.push(edge.source);
      dependencyMap.set(edge.target, dependencies);
    }
  });

  return dependencyMap;
}

/**
 * Checks if all dependencies for a node have completed successfully.
 */
function areDependenciesComplete(
  nodeId: string,
  dependencyMap: Map<string, string[]>,
  completedNodes: Set<string>
): boolean {
  const dependencies = dependencyMap.get(nodeId) || [];
  return dependencies.every((depId) => completedNodes.has(depId));
}

/**
 * Mock execution function for a single node.
 * Simulates work with a random delay between 500-1500ms.
 */
async function executeNode(node: Node): Promise<unknown> {
  // Simulate execution time (500-1500ms)
  const delay = Math.random() * 1000 + 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Mock result based on node type
  // In real implementation, this would call the appropriate service
  switch (node.type) {
    case "text":
      return (node.data as { value?: string })?.value || "";
    case "uploadImage":
      return (node.data as { imageUrl?: string | null })?.imageUrl || null;
    case "uploadVideo":
      return (node.data as { videoUrl?: string | null })?.videoUrl || null;
    case "llm":
      return `Mock LLM output for node ${node.id}`;
    case "cropImage":
      return `Mock cropped image URL for node ${node.id}`;
    case "extractFrame":
      return `Mock extracted frame URL for node ${node.id}`;
    default:
      return { mock: true, nodeId: node.id };
  }
}

/**
 * Executes a workflow by running nodes in parallel when dependencies are met.
 * Uses topological sort to ensure correct execution order.
 *
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @param callbacks - Callbacks for execution events
 */
export async function runWorkflow(
  nodes: Node[],
  edges: Edge[],
  callbacks: ExecutionCallbacks = {}
): Promise<void> {
  const {
    onNodeStart,
    onNodeComplete,
    onNodeError,
    onWorkflowComplete,
    onWorkflowError,
    setNodeStatus,
    setNodeResult,
  } = callbacks;

  try {
    // Validate DAG and get execution order
    const executionOrder = getExecutionOrder(nodes, edges);
    const dependencyMap = buildDependencyMap(nodes, edges);

    // Track completed nodes
    const completedNodes = new Set<string>();
    // Track nodes currently executing
    const executingNodes = new Set<string>();
    // Queue of nodes ready to execute (dependencies met)
    const readyQueue: Node[] = [];
    // Map of node IDs to their Node objects for quick lookup
    const nodeMap = new Map<string, Node>();
    executionOrder.forEach((node) => {
      nodeMap.set(node.id, node);
    });

    // Initialize all nodes to idle
    executionOrder.forEach((node) => {
      setNodeStatus?.(node.id, "idle");
    });

    // Find entry nodes (nodes with no dependencies) and add them to ready queue
    executionOrder.forEach((node) => {
      const dependencies = dependencyMap.get(node.id) || [];
      if (dependencies.length === 0) {
        readyQueue.push(node);
      }
    });

    // Execute nodes in parallel
    const executionPromises: Promise<void>[] = [];

    /**
     * Executes a single node and triggers dependent nodes when complete.
     */
    async function executeNodeAndContinue(node: Node): Promise<void> {
      try {
        // Mark as running
        executingNodes.add(node.id);
        setNodeStatus?.(node.id, "running");
        onNodeStart?.(node.id);

        // Execute the node
        const result = await executeNode(node);

        // Mark as completed
        executingNodes.delete(node.id);
        completedNodes.add(node.id);
        setNodeStatus?.(node.id, "success");
        setNodeResult?.(node.id, result);
        onNodeComplete?.(node.id, result);

        // Check which dependent nodes can now execute
        executionOrder.forEach((dependentNode) => {
          if (
            !executingNodes.has(dependentNode.id) &&
            !completedNodes.has(dependentNode.id) &&
            areDependenciesComplete(dependentNode.id, dependencyMap, completedNodes)
          ) {
            // All dependencies are complete, execute this node
            executionPromises.push(executeNodeAndContinue(dependentNode));
          }
        });
      } catch (error) {
        executingNodes.delete(node.id);
        setNodeStatus?.(node.id, "failed");
        const err = error instanceof Error ? error : new Error(String(error));
        onNodeError?.(node.id, err);

        // Continue with other branches even if one fails (for now)
        // Could be changed to stop all execution if needed
      }
    }

    // Start executing all ready nodes in parallel
    readyQueue.forEach((node) => {
      executionPromises.push(executeNodeAndContinue(node));
    });

    // Wait for all nodes to complete
    // Use Promise.allSettled to handle individual node failures without stopping all
    await Promise.allSettled(executionPromises);

    onWorkflowComplete?.();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onWorkflowError?.(err);
    throw err;
  }
}

/**
 * Resets all node statuses to idle.
 */
export function resetWorkflowStatus(
  nodes: Node[],
  setNodeStatus?: (nodeId: string, status: NodeExecutionStatus) => void
): void {
  nodes.forEach((node) => {
    setNodeStatus?.(node.id, "idle");
  });
}
