import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { runId, nodeId, status, output, error, nodeType, nodeName } = body;

        if (!runId || !nodeId || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify run ownership
        const run = await prisma.workflowRun.findUnique({
            where: { id: runId },
            include: { workflow: { include: { owner: true } } }
        });

        if (!run || run.workflow.owner.clerkId !== userId) {
            return NextResponse.json({ error: 'Run not found or unauthorized' }, { status: 404 });
        }

        // Create NodeExecution
        await prisma.nodeExecution.create({
            data: {
                runId,
                nodeId,
                nodeType: nodeType || 'unknown',
                nodeName: nodeName || 'Node',
                status,
                output: output ?? undefined,
                error: error ?? undefined,
                completedAt: new Date(),
                // duration is calculated by (completedAt - startedAt) if we tracked start. 
                // For now we just mark completion.
            }
        });

        // Update Run Counters
        if (status === 'success') {
            await prisma.workflowRun.update({
                where: { id: runId },
                data: { successfulNodes: { increment: 1 } }
            });
        } else if (status === 'failed') {
            await prisma.workflowRun.update({
                where: { id: runId },
                data: { failedNodes: { increment: 1 } }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating node execution:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
