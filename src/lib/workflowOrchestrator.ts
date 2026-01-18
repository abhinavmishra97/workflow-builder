import { task } from "@trigger.dev/sdk/v3";
import type { Node, Edge } from "reactflow";
import { tasks } from "@trigger.dev/sdk/v3";

/**
 * Main workflow orchestrator task
 * This task coordinates the execution of all nodes in a workflow
 * 
 * IMPORTANT: This runs inside Trigger.dev, so it CAN use triggerAndWait()
 */
export const executeWorkflow = task({
    id: "execute-workflow",
    async run(payload: WorkflowExecutionInput): Promise<WorkflowExecutionOutput> {
        const { nodes, edges, selectedNodeIds } = payload;

        console.log("[Workflow Orchestrator] Starting workflow execution");
        console.log(`[Workflow Orchestrator] Total nodes: ${nodes.length}`);
        console.log(`[Workflow Orchestrator] Selected nodes: ${selectedNodeIds?.length || "all"}`);

        // Import database service
        const { updateNodeExecution } = await import("@/lib/workflowRunService");

        // Get the workflow run ID from the trigger context
        // Note: We'll need to pass this in the payload
        const workflowRunId = (payload as any).workflowRunId;

        const nodeResults: Record<string, { status: "success" | "failed"; output?: any; error?: string }> = {};

        // Filter nodes to execute
        const nodesToExecute = selectedNodeIds
            ? nodes.filter(n => selectedNodeIds.includes(n.id))
            : nodes;

        // Build dependency map
        const dependencyMap = new Map<string, string[]>();
        nodes.forEach(node => {
            const dependencies = edges
                .filter(edge => edge.target === node.id)
                .map(edge => edge.source);
            dependencyMap.set(node.id, dependencies);
        });

        // Execute nodes in topological order
        const executed = new Set<string>();
        const executing = new Set<string>();

        async function executeNode(node: Node): Promise<void> {
            if (executed.has(node.id) || executing.has(node.id)) {
                return;
            }

            // Wait for dependencies
            const deps = dependencyMap.get(node.id) || [];
            for (const depId of deps) {
                const depNode = nodes.find(n => n.id === depId);
                if (depNode) {
                    await executeNode(depNode);
                }
            }

            executing.add(node.id);

            try {
                console.log(`[Workflow Orchestrator] Executing node: ${node.id} (${node.type})`);

                // Update database: node started
                if (workflowRunId) {
                    await updateNodeExecution({
                        runId: workflowRunId,
                        nodeId: node.id,
                        status: "running",
                    });
                }

                let result: any;

                switch (node.type) {
                    case "text":
                        result = (node.data as { value?: string })?.value || "";
                        break;

                    case "uploadImage":
                        result = (node.data as { imageUrl?: string | null })?.imageUrl || null;
                        break;

                    case "uploadVideo":
                        result = (node.data as { videoUrl?: string | null })?.videoUrl || null;
                        break;

                    case "cropImage":
                        // Get image URL from connected node or node data
                        let imageUrl = (node.data as any)?.imageUrl;
                        const imageEdges = edges.filter(e => e.target === node.id && e.targetHandle === "image");
                        if (imageEdges.length > 0) {
                            const sourceResult = nodeResults[imageEdges[0].source];
                            if (sourceResult?.output) {
                                imageUrl = sourceResult.output;
                            }
                        }

                        if (!imageUrl) {
                            throw new Error("No image URL provided");
                        }

                        // NOW we can use triggerAndWait because we're inside a task!
                        const cropResult = await tasks.triggerAndWait("crop-image", {
                            imageUrl,
                            xPercent: (node.data as any)?.xPercent || 0,
                            yPercent: (node.data as any)?.yPercent || 0,
                            widthPercent: (node.data as any)?.widthPercent || 100,
                            heightPercent: (node.data as any)?.heightPercent || 100,
                        });

                        if (!cropResult.ok) {
                            throw new Error("Crop task failed");
                        }

                        if (!cropResult.output.success) {
                            throw new Error(cropResult.output.error || "Crop failed");
                        }

                        result = cropResult.output.output; // Access the nested output property
                        break;

                    case "llm":
                        // Aggregate inputs from connected nodes
                        const llmData = node.data as any;
                        let systemPrompt = llmData.systemPrompt;
                        let userMessage = llmData.userMessage;
                        const imageUrls: string[] = [];

                        // Get inputs from connected nodes
                        edges.forEach(edge => {
                            if (edge.target !== node.id) return;

                            const sourceResult = nodeResults[edge.source];
                            if (!sourceResult?.output) return;

                            if (edge.targetHandle === "system_prompt") {
                                systemPrompt = sourceResult.output;
                            } else if (edge.targetHandle === "user_message" || !edge.targetHandle) {
                                userMessage = sourceResult.output;
                            } else if (edge.targetHandle === "images") {
                                imageUrls.push(sourceResult.output);
                            }
                        });

                        if (!userMessage) {
                            throw new Error("userMessage is required");
                        }

                        // NOW we can use triggerAndWait because we're inside a task!
                        const llmResult = await tasks.triggerAndWait("execute-llm", {
                            systemPrompt,
                            userMessage,
                            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                            model: llmData.model || "gemini-2.5-flash",
                        });

                        if (!llmResult.ok) {
                            throw new Error("LLM task failed");
                        }

                        if (!llmResult.output.success) {
                            throw new Error(llmResult.output.error || "LLM execution failed");
                        }

                        result = llmResult.output.output;
                        break;

                    default:
                        result = { mock: true, nodeId: node.id };
                }

                nodeResults[node.id] = {
                    status: "success",
                    output: result,
                };

                // Update database: node succeeded
                if (workflowRunId) {
                    await updateNodeExecution({
                        runId: workflowRunId,
                        nodeId: node.id,
                        status: "success",
                        output: result,
                    });
                }

                console.log(`[Workflow Orchestrator] Node ${node.id} completed successfully`);
            } catch (error) {
                console.error(`[Workflow Orchestrator] Node ${node.id} failed:`, error);

                const errorMessage = error instanceof Error ? error.message : "Unknown error";

                nodeResults[node.id] = {
                    status: "failed",
                    error: errorMessage,
                };

                // Update database: node failed
                if (workflowRunId) {
                    await updateNodeExecution({
                        runId: workflowRunId,
                        nodeId: node.id,
                        status: "failed",
                        error: errorMessage,
                    });
                }
            } finally {
                executing.delete(node.id);
                executed.add(node.id);
            }
        }

        // Execute all nodes
        for (const node of nodesToExecute) {
            await executeNode(node);
        }

        console.log("[Workflow Orchestrator] Workflow execution completed");

        return {
            success: true,
            nodeResults,
        };
    },
});

export interface WorkflowExecutionInput {
    nodes: Node[];
    edges: Edge[];
    selectedNodeIds?: string[];
}

export interface WorkflowExecutionOutput {
    success: boolean;
    nodeResults: Record<string, {
        status: "success" | "failed";
        output?: any;
        error?: string;
    }>;
}

