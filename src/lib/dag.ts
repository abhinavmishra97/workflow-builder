import type { Node, Edge } from "reactflow";

export class CycleError extends Error {
  constructor(message: string, public cycle: string[]) {
    super(message);
    this.name = "CycleError";
  }
}

/**
 * Builds an adjacency list representation of the graph from nodes and edges.
 * Returns a map where each node ID maps to an array of its outgoing edge target IDs.
 */
function buildAdjacencyList(nodes: Node[], edges: Edge[]): Map<string, string[]> {
  const adjacencyList = new Map<string, string[]>();

  // Initialize all nodes with empty arrays
  nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
  });

  // Add edges to adjacency list
  edges.forEach((edge) => {
    if (edge.source && edge.target) {
      const sources = adjacencyList.get(edge.source) || [];
      sources.push(edge.target);
      adjacencyList.set(edge.source, sources);
    }
  });

  return adjacencyList;
}

/**
 * Builds a reverse adjacency list (incoming edges) for topological sort.
 * Returns a map where each node ID maps to an array of its incoming edge source IDs.
 */
function buildReverseAdjacencyList(nodes: Node[], edges: Edge[]): Map<string, string[]> {
  const reverseAdjacencyList = new Map<string, string[]>();

  // Initialize all nodes with empty arrays
  nodes.forEach((node) => {
    reverseAdjacencyList.set(node.id, []);
  });

  // Add edges to reverse adjacency list
  edges.forEach((edge) => {
    if (edge.source && edge.target) {
      const targets = reverseAdjacencyList.get(edge.target) || [];
      targets.push(edge.source);
      reverseAdjacencyList.set(edge.target, targets);
    }
  });

  return reverseAdjacencyList;
}

/**
 * Validates that the graph is acyclic using DFS.
 * Throws CycleError if a cycle is detected.
 *
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @throws {CycleError} If a cycle is detected
 */
export function validateDAG(nodes: Node[], edges: Edge[]): void {
  const adjacencyList = buildAdjacencyList(nodes, edges);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cyclePath: string[] = [];

  /**
   * DFS helper function to detect cycles
   */
  function hasCycle(nodeId: string): boolean {
    // Mark current node as visited and add to recursion stack
    visited.add(nodeId);
    recursionStack.add(nodeId);
    cyclePath.push(nodeId);

    // Check all neighbors
    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighborId of neighbors) {
      // If neighbor is not visited, recurse
      if (!visited.has(neighborId)) {
        if (hasCycle(neighborId)) {
          return true;
        }
      }
      // If neighbor is in recursion stack, we found a cycle
      else if (recursionStack.has(neighborId)) {
        cyclePath.push(neighborId);
        return true;
      }
    }

    // Remove from recursion stack before returning
    recursionStack.delete(nodeId);
    cyclePath.pop();
    return false;
  }

  // Check for cycles starting from each unvisited node
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      cyclePath.length = 0; // Reset cycle path
      if (hasCycle(node.id)) {
        // Find the actual cycle by locating the repeated node
        const cycleStart = cyclePath[cyclePath.length - 1];
        const cycleStartIndex = cyclePath.indexOf(cycleStart);
        const actualCycle = cyclePath.slice(cycleStartIndex);
        throw new CycleError(
          `Cycle detected in workflow graph: ${actualCycle.join(" -> ")}`,
          actualCycle
        );
      }
    }
  }
}

/**
 * Computes the in-degree (number of incoming edges) for each node.
 */
function computeInDegrees(
  nodes: Node[],
  reverseAdjacencyList: Map<string, string[]>
): Map<string, number> {
  const inDegrees = new Map<string, number>();

  nodes.forEach((node) => {
    const incoming = reverseAdjacencyList.get(node.id) || [];
    inDegrees.set(node.id, incoming.length);
  });

  return inDegrees;
}

/**
 * Returns nodes in topological order (execution-safe order).
 * Uses Kahn's algorithm for topological sorting.
 *
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns Array of nodes in topological order
 * @throws {CycleError} If a cycle is detected (should be caught by validateDAG first)
 */
export function getExecutionOrder(nodes: Node[], edges: Edge[]): Node[] {
  // First validate that the graph is acyclic
  validateDAG(nodes, edges);

  const reverseAdjacencyList = buildReverseAdjacencyList(nodes, edges);
  const inDegrees = computeInDegrees(nodes, reverseAdjacencyList);
  const adjacencyList = buildAdjacencyList(nodes, edges);

  // Queue for nodes with no incoming edges
  const queue: string[] = [];
  const result: Node[] = [];

  // Find all nodes with no incoming edges
  inDegrees.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  // Process nodes
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    const currentNode = nodes.find((n) => n.id === currentNodeId);

    if (currentNode) {
      result.push(currentNode);
    }

    // Reduce in-degree for all neighbors
    const neighbors = adjacencyList.get(currentNodeId) || [];
    for (const neighborId of neighbors) {
      const currentInDegree = inDegrees.get(neighborId) || 0;
      const newInDegree = currentInDegree - 1;
      inDegrees.set(neighborId, newInDegree);

      // If in-degree becomes 0, add to queue
      if (newInDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  // If we didn't process all nodes, there's a cycle (shouldn't happen after validateDAG)
  if (result.length !== nodes.length) {
    const processedIds = new Set(result.map((n) => n.id));
    const unprocessedNodes = nodes.filter((n) => !processedIds.has(n.id));
    throw new CycleError(
      `Cannot compute execution order: cycle detected involving nodes: ${unprocessedNodes.map((n) => n.id).join(", ")}`,
      unprocessedNodes.map((n) => n.id)
    );
  }

  return result;
}

/**
 * Gets all nodes that have no dependencies (no incoming edges).
 * These are the entry points of the workflow.
 *
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns Array of nodes with no incoming edges
 */
export function getEntryNodes(nodes: Node[], edges: Edge[]): Node[] {
  const reverseAdjacencyList = buildReverseAdjacencyList(nodes, edges);
  return nodes.filter((node) => {
    const incoming = reverseAdjacencyList.get(node.id) || [];
    return incoming.length === 0;
  });
}

/**
 * Gets all nodes that have no dependents (no outgoing edges).
 * These are the exit points of the workflow.
 *
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns Array of nodes with no outgoing edges
 */
export function getExitNodes(nodes: Node[], edges: Edge[]): Node[] {
  const adjacencyList = buildAdjacencyList(nodes, edges);
  return nodes.filter((node) => {
    const outgoing = adjacencyList.get(node.id) || [];
    return outgoing.length === 0;
  });
}
