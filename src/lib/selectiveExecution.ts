import type { Node, Edge } from "reactflow";
import { runWorkflow} from "./workflowExecutor";
import type { NodeExecutionStatus, NodeResult } from "@/types/workflow";

export async function runSelectedNodes(
    allNodes: Node[],
    allEdges: Edge[],
    selectedNodeIds: Set<string>,
    callbacks: {
        setNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
        setNodeResult: (nodeId: string, result: Omit<NodeResult, "nodeId">) => void;
        onNodeError?: (nodeId: string, error: Error) => void;
        onWorkflowComplete?: () => void;
        onWorkflowError?: (error: Error) => void;
    }
): Promise<void> {
    // Filter to only selected nodes
    const selectedNodes = allNodes.filter(node => selectedNodeIds.has(node.id));

    // Filter edges to only those connecting selected nodes
    const selectedEdges = allEdges.filter(
        edge => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    );

    // Reset status for selected nodes only
    selectedNodes.forEach(node => {
        callbacks.setNodeStatus(node.id, "idle");
    });

    // Run workflow with only selected nodes
    await runWorkflow(selectedNodes, selectedEdges, callbacks);
}
