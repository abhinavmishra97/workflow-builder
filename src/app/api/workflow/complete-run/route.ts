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
        const { runId, status } = body;

        if (!runId || !status) {
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

        const completedAt = new Date();
        const duration = completedAt.getTime() - new Date(run.createdAt).getTime();

        await prisma.workflowRun.update({
            where: { id: runId },
            data: {
                status,
                completedAt,
                duration
            }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error completing workflow run:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
