import { prisma } from "@/lib/prisma";
import type { Node } from "reactflow";

export async function createWorkflowRun(input: {
    workflowId: string;
    nodes: Node[];
}) {
    return prisma.workflowRun.create({
        data: {
            workflowId: input.workflowId,
            status: "running",
            totalNodes: input.nodes.length,
            successfulNodes: 0,
            failedNodes: 0,
            nodeExecutions: {
                create: input.nodes.map((node) => ({
                    nodeId: node.id,
                    nodeType: node.type || "unknown",
                    nodeName: (node.data as any)?.label || node.type || "Node",
                    status: "idle",
                })),
            },
        },
    });
}

export async function updateNodeExecution(input: {
    runId: string;
    nodeId: string;
    status: "running" | "success" | "failed";
    output?: any;
    error?: string;
}) {
    const now = new Date();

    const nodeExec = await prisma.nodeExecution.findFirst({
        where: { runId: input.runId, nodeId: input.nodeId },
    });

    if (!nodeExec) return;

    await prisma.nodeExecution.update({
        where: { id: nodeExec.id },
        data: {
            status: input.status,
            output: input.output,
            error: input.error,
            startedAt: input.status === "running" ? now : nodeExec.startedAt,
            completedAt:
                input.status === "success" || input.status === "failed"
                    ? now
                    : undefined,
        },
    });

    const all = await prisma.nodeExecution.findMany({
        where: { runId: input.runId },
    });

    const successful = all.filter((n) => n.status === "success").length;
    const failed = all.filter((n) => n.status === "failed").length;
    const running = all.filter((n) => n.status === "running").length;

    let status = "running";
    if (running === 0) {
        if (failed === 0) status = "completed";
        else if (successful > 0) status = "partial";
        else status = "failed";
    }

    await prisma.workflowRun.update({
        where: { id: input.runId },
        data: {
            status,
            successfulNodes: successful,
            failedNodes: failed,
            completedAt: status !== "running" ? now : undefined,
        },
    });
}

export async function getWorkflowRun(runId: string) {
    return prisma.workflowRun.findUnique({
        where: { id: runId },
        include: { nodeExecutions: true },
    });
}
