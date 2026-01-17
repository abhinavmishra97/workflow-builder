import type { Node, Edge } from "reactflow";
import { getExecutionOrder, CycleError } from "./dag";
import type { NodeExecutionStatus, NodeResult } from "@/types/workflow";
import type { LLMNodeData } from "@/components/nodes/LLMNode";

export type ExecutionCallbacks = {
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, result: unknown) => void;
  onNodeError?: (nodeId: string, error: Error) => void;
  onWorkflowComplete?: () => void;
  onWorkflowError?: (error: Error) => void;
  setNodeStatus?: (nodeId: string, status: NodeExecutionStatus) => void;
  setNodeResult?: (nodeId: string, result: Omit<NodeResult, "nodeId">) => void;
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
 * Aggregates input values for an LLM node from connected nodes.
 */
function aggregateLLMInputs(
  node: Node<LLMNodeData>,
  nodes: Node[],
  edges: Edge[],
  nodeResults: Record<string, { output: unknown }>
): { systemPrompt?: string; userMessage: string; imageUrls?: string[] } {
  const nodeData = node.data as LLMNodeData;

  console.log('[aggregateLLMInputs] Starting aggregation for node:', node.id);
  console.log('[aggregateLLMInputs] Node data:', { systemPrompt: nodeData.systemPrompt, userMessage: nodeData.userMessage });
  console.log('[aggregateLLMInputs] Available nodeResults:', Object.keys(nodeResults));

  // Log ALL edges to see what's connected
  const allEdgesToThisNode = edges.filter(edge => edge.target === node.id);
  console.log('[aggregateLLMInputs] ALL edges to this node:', allEdgesToThisNode.map(e => ({
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle
  })));

  // Find edges connected to this LLM node
  const systemPromptEdges = edges.filter(
    (edge) => edge.target === node.id && edge.targetHandle === "system_prompt"
  );

  // For userMessage, also accept null targetHandle from Text nodes (default connection)
  const userMessageEdges = edges.filter((edge) => {
    if (edge.target !== node.id) return false;

    // Explicit userMessage connection
    if (edge.targetHandle === "user_message") return true;

    // Fallback: null targetHandle from Text node defaults to userMessage
    if (edge.targetHandle === null || edge.targetHandle === undefined) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode?.type === "text") {
        console.log('[aggregateLLMInputs] Treating null targetHandle from Text node as userMessage');
        return true;
      }
    }

    return false;
  });

  const imageEdges = edges.filter(
    (edge) => edge.target === node.id && edge.targetHandle === "images"
  );

  console.log('[aggregateLLMInputs] Connected edges:', {
    systemPrompt: systemPromptEdges.length,
    userMessage: userMessageEdges.length,
    images: imageEdges.length
  });

  // Get system prompt from connected nodes or node data
  // Prioritize nodeResults (output from upstream nodes) over node data
  let systemPrompt: string | undefined = undefined;
  systemPromptEdges.forEach((edge) => {
    console.log('[aggregateLLMInputs] Processing systemPrompt edge from:', edge.source);
    // First check nodeResults (output from upstream execution)
    const result = nodeResults[edge.source];
    if (result && typeof result.output === "string" && result.output.trim()) {
      systemPrompt = result.output.trim();
      console.log('[aggregateLLMInputs] Got systemPrompt from nodeResults:', systemPrompt.substring(0, 50));
      return;
    }
    // Fallback to node data
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (sourceNode?.type === "text") {
      const textData = sourceNode.data as { value?: string };
      if (textData?.value && textData.value.trim()) {
        systemPrompt = textData.value.trim();
        console.log('[aggregateLLMInputs] Got systemPrompt from node data:', systemPrompt.substring(0, 50));
      }
    }
  });
  // If no connection, use node's own data
  if (!systemPrompt && systemPromptEdges.length === 0) {
    systemPrompt = nodeData.systemPrompt?.trim() || undefined;
    if (systemPrompt) {
      console.log('[aggregateLLMInputs] Using LLM node own systemPrompt:', systemPrompt.substring(0, 50));
    }
  }

  // Get user message from connected nodes or node data
  // Prioritize nodeResults (output from upstream nodes) over node data
  let userMessage = "";
  userMessageEdges.forEach((edge) => {
    console.log('[aggregateLLMInputs] Processing userMessage edge from:', edge.source);
    // First check nodeResults (output from upstream execution)
    const result = nodeResults[edge.source];
    console.log('[aggregateLLMInputs] nodeResults for source:', result);
    if (result && typeof result.output === "string" && result.output.trim()) {
      userMessage = result.output.trim();
      console.log('[aggregateLLMInputs] Got userMessage from nodeResults:', userMessage.substring(0, 50));
      return;
    }
    // Fallback to node data
    const sourceNode = nodes.find((n) => n.id === edge.source);
    console.log('[aggregateLLMInputs] Source node:', sourceNode?.type, sourceNode?.data);
    if (sourceNode?.type === "text") {
      const textData = sourceNode.data as { value?: string };
      if (textData?.value && textData.value.trim()) {
        userMessage = textData.value.trim();
        console.log('[aggregateLLMInputs] Got userMessage from node data:', userMessage.substring(0, 50));
      }
    }
  });
  // If no connection, use node's own data
  if (!userMessage && userMessageEdges.length === 0) {
    userMessage = nodeData.userMessage?.trim() || "";
    if (userMessage) {
      console.log('[aggregateLLMInputs] Using LLM node own userMessage:', userMessage.substring(0, 50));
    }
  }

  // Get image URLs from connected nodes
  // Prioritize nodeResults (output from upstream execution) over node data
  const imageUrls: string[] = [];
  imageEdges.forEach((edge) => {
    // First check nodeResults (output from upstream execution)
    const result = nodeResults[edge.source];
    if (result && typeof result.output === "string" && result.output.trim()) {
      imageUrls.push(result.output.trim());
      return;
    }
    // Fallback to node data
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (sourceNode?.type === "uploadImage") {
      const imageData = sourceNode.data as { imageUrl?: string | null };
      if (imageData?.imageUrl && imageData.imageUrl.trim()) {
        imageUrls.push(imageData.imageUrl.trim());
      }
    }
  });

  const finalInputs = {
    systemPrompt: systemPrompt || undefined,
    userMessage: userMessage || "",
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  };

  console.log('[aggregateLLMInputs] Final aggregated inputs:', {
    systemPrompt: finalInputs.systemPrompt?.substring(0, 50),
    userMessage: finalInputs.userMessage?.substring(0, 50),
    imageUrls: finalInputs.imageUrls
  });

  return finalInputs;
}

/**
 * Executes a single node.
 * For LLM nodes, calls Trigger.dev task with Gemini.
 * For other nodes, uses mock execution.
 */
async function executeNode(
  node: Node,
  allNodes: Node[],
  allEdges: Edge[],
  nodeResults: Record<string, { output: unknown }>
): Promise<unknown> {
  // Handle LLM nodes with Trigger.dev + Gemini
  if (node.type === "llm") {
    try {
      const nodeData = node.data as LLMNodeData;
      const inputs = aggregateLLMInputs(node, allNodes, allEdges, nodeResults);

      // Validate that userMessage is not empty
      if (!inputs.userMessage || !inputs.userMessage.trim()) {
        throw new Error("userMessage is required but was empty. Please connect a Text node or enter a message in the LLM node.");
      }

      // Call Trigger.dev task via API route (required for server-side execution)
      console.log('[LLM Node] Executing with inputs:', {
        systemPrompt: inputs.systemPrompt?.substring(0, 50),
        userMessage: inputs.userMessage?.substring(0, 50),
        imageUrls: inputs.imageUrls,
        model: nodeData.model || "gemini-pro"
      });

      const response = await fetch("/api/trigger/execute-llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemPrompt: inputs.systemPrompt,
          userMessage: inputs.userMessage,
          imageUrls: inputs.imageUrls,
          model: nodeData.model || "gemini-pro",
        }),
      });

      console.log('[LLM Node] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LLM Node] Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || "Request failed" };
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[LLM Node] Result:', result);

      if (!result.success) {
        throw new Error(result.error || "LLM task returned failure");
      }

      // result.output is the text string from Gemini
      return result.output || "";
    } catch (error) {
      // Log and re-throw so executor can mark node as failed
      console.error('[LLM Node] Execution error:', error);
      throw error;
    }
  }

  // Mock execution for other node types
  const delay = Math.random() * 1000 + 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  switch (node.type) {
    case "text":
      return (node.data as { value?: string })?.value || "";
    case "uploadImage":
      return (node.data as { imageUrl?: string | null })?.imageUrl || null;
    case "uploadVideo":
      return (node.data as { videoUrl?: string | null })?.videoUrl || null;
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

    // Track node results as they complete (for dependency resolution)
    const currentResults: Record<string, { output: unknown }> = {};

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

        // Execute the node (pass all context for LLM input aggregation)
        const result = await executeNode(node, nodes, edges, currentResults);

        // Mark as completed
        executingNodes.delete(node.id);
        completedNodes.add(node.id);
        currentResults[node.id] = { output: result };
        setNodeStatus?.(node.id, "success");
        setNodeResult?.(node.id, { output: result, timestamp: Date.now() });
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
