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
        const { workflowId, nodes, scope = 'full' } = body;

        if (!workflowId) {
            return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const workflow = await prisma.workflowFile.findFirst({
            where: { id: workflowId, ownerId: user.id }
        });

        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }

        const run = await prisma.workflowRun.create({
            data: {
                workflowId,
                status: 'running',
                scope,
                totalNodes: nodes ? nodes.length : 0,
            }
        });

        return NextResponse.json({ runId: run.id });

    } catch (error) {
        console.error('Error creating workflow run:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
