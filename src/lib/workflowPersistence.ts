import { Node } from "reactflow";

// Helper to persist a single node run to the backend
export async function persistSingleNodeRun(
    workflowId: string,
    node: Node,
    output: any,
    status: "success" | "failed",
    error?: string
) {
    try {
        // 1. Create Run
        const createRunRes = await fetch("/api/workflow/create-run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                workflowId,
                nodes: [node],
                scope: "single"
            }),
        });

        if (!createRunRes.ok) throw new Error("Failed to create run log");
        const { runId } = await createRunRes.json();

        // 2. Update Node Execution
        await fetch("/api/workflow/update-node", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                runId,
                nodeId: node.id,
                nodeType: node.type,
                nodeName: (node.data as any)?.label || node.type || "Node",
                status: status,
                output: status === "success" ? output : undefined,
                error: status === "failed" ? (error || "Unknown error") : undefined,
            }),
        });

        // 3. Complete Run
        await fetch("/api/workflow/complete-run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                runId,
                status: status,
            }),
        });

        console.log("[Persistence] Single node run saved:", runId);
    } catch (err) {
        console.error("[Persistence] Failed to save single node run:", err);
    }
}
